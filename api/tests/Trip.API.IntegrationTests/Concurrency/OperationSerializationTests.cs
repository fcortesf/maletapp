using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Trip.API.Application.Abstractions;
using Trip.API.Infrastructure.Concurrency;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Concurrency;

public sealed class OperationSerializationTests
{
    [Fact]
    public async Task ConcurrentAdditions_ShareDefaultBaggage_AndReadWaitsAsync()
    {
        using var gate = new ControlledGate();
        await using var factory = new TripApiFactory();
        await using var app = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDomainOperationGate>();
            services.AddSingleton<IDomainOperationGate>(gate);
        }));
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await (await client.PostAsJsonAsync("/trips", new { destination = "Lisbon" })).Content.ReadFromJsonAsync<JsonElement>();
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}/items";
        gate.PauseNext();
        var first = client.PostAsJsonAsync(url, new { name = "First" });
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var second = client.PostAsJsonAsync(url, new { name = "Second" });
        await gate.Queued.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var read = client.GetAsync(url);
        Assert.False(first.IsCompleted);
        Assert.False(second.IsCompleted);
        Assert.False(read.IsCompleted);
        gate.Resume();
        Assert.Equal(HttpStatusCode.Created, (await first).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await second).StatusCode);
        await read;
        var items = await client.GetFromJsonAsync<JsonElement>(url);
        Assert.Equal(2, items.GetArrayLength());
        Assert.Equal(items[0].GetProperty("baggageId"), items[1].GetProperty("baggageId"), JsonElementEqualityComparer.Instance);
        Assert.Equal(1, gate.MaximumActive);
    }

    [Theory]
    [InlineData("disjoint")]
    [InlineData("same")]
    [InlineData("sibling")]
    [InlineData("lifecycle")]
    [InlineData("delete-first")]
    [InlineData("delete-last")]
    public async Task ControlledOrder_PreservesSerialOutcomesAsync(string scenario)
    {
        using var gate = new ControlledGate();
        await using var factory = new TripApiFactory();
        await using var app = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDomainOperationGate>();
            services.AddSingleton<IDomainOperationGate>(gate);
        }));
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await (await client.PostAsJsonAsync("/trips", new { destination = "Lisbon" })).Content.ReadFromJsonAsync<JsonElement>();
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}";
        var item = await (await client.PostAsJsonAsync(url + "/items", new { name = "First", category = "health", itemCount = 2 })).Content.ReadFromJsonAsync<JsonElement>();
        var sibling = await (await client.PostAsJsonAsync(url + "/items", new { name = "Sibling" })).Content.ReadFromJsonAsync<JsonElement>();
        var itemUrl = $"/items/{item.GetProperty("id").GetGuid()}";
        var siblingUrl = $"/items/{sibling.GetProperty("id").GetGuid()}";
        gate.PauseNext();
        var first = scenario switch
        {
            "delete-first" => client.DeleteAsync(url),
            "sibling" => client.DeleteAsync(siblingUrl),
            "lifecycle" => client.PostAsync(url + "/finish", null),
            _ => client.PatchAsJsonAsync(itemUrl, new { notes = "First" })
        };
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var second = scenario switch
        {
            "delete-last" => client.DeleteAsync(url),
            "same" => client.PatchAsJsonAsync(itemUrl, new { notes = "Last" }),
            _ => client.PatchAsJsonAsync(itemUrl, new { isPacked = true })
        };
        await gate.Queued.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.False(second.IsCompleted);
        gate.Resume();
        (await first).EnsureSuccessStatusCode();
        Assert.Equal(scenario == "delete-first" ? HttpStatusCode.NotFound : scenario == "delete-last" ? HttpStatusCode.NoContent : HttpStatusCode.OK, (await second).StatusCode);
        if (scenario.StartsWith("delete-", StringComparison.Ordinal))
        {
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(itemUrl)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync(url + "/finish", null)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync(url + "/items", new { name = "Cannot resurrect" })).StatusCode);
        }
        else
        {
            var final = await client.GetFromJsonAsync<JsonElement>(itemUrl);
            Assert.Equal("health", final.GetProperty("category").GetString());
            Assert.Equal(2, final.GetProperty("itemCount").GetInt32());
            if (scenario == "same") Assert.Equal("Last", final.GetProperty("notes").GetString());
            else Assert.True(final.GetProperty("isPacked").GetBoolean());
            if (scenario == "disjoint") Assert.Equal("First", final.GetProperty("notes").GetString());
            if (scenario == "sibling") Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(siblingUrl)).StatusCode);
            if (scenario == "lifecycle") Assert.True((await client.GetFromJsonAsync<JsonElement>(url)).GetProperty("isFinished").GetBoolean());
        }
        Assert.Equal(1, gate.MaximumActive);
    }

    private sealed class ControlledGate : IDomainOperationGate, IDisposable
    {
        private readonly DomainOperationGate _gate = new();
        private int _pause;
        private int _active;
        public int MaximumActive { get; private set; }
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Queued { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource _resume = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public void PauseNext() => _pause = 1;
        public void Resume() => _resume.TrySetResult();
        public async Task<IDisposable> AcquireAsync(CancellationToken cancellationToken)
        {
            if (Entered.Task.IsCompleted && !_resume.Task.IsCompleted) Queued.TrySetResult();
            var lease = await _gate.AcquireAsync(cancellationToken);
            MaximumActive = Math.Max(MaximumActive, Interlocked.Increment(ref _active));
            try
            {
                if (Interlocked.Exchange(ref _pause, 0) == 1)
                {
                    Entered.TrySetResult();
                    await _resume.Task.WaitAsync(cancellationToken);
                }
                return new ActionLease(() => { Interlocked.Decrement(ref _active); lease.Dispose(); });
            }
            catch { Interlocked.Decrement(ref _active); lease.Dispose(); throw; }
        }
        public void Dispose() => _gate.Dispose();
    }

    private sealed class ActionLease(Action release) : IDisposable
    {
        public void Dispose() => release();
    }

    private sealed class JsonElementEqualityComparer : IEqualityComparer<JsonElement>
    {
        public static JsonElementEqualityComparer Instance { get; } = new();
        public bool Equals(JsonElement x, JsonElement y) => x.GetRawText() == y.GetRawText();
        public int GetHashCode(JsonElement obj) => obj.GetRawText().GetHashCode(StringComparison.Ordinal);
    }
}
