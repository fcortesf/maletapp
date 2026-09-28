using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Trips;

public sealed class TripLifecycleEndpointTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("2020-01-01", "2020-02-01")]
    [InlineData("2099-01-01", "2099-02-01")]
    public async Task Lifecycle_IsExplicitIdempotentAndEditableAsync(string? startDate, string? endDate)
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var created = await client.PostAsJsonAsync("/trips", new { destination = "Lisbon", startDate, endDate, isFinished = true });
        var trip = await created.Content.ReadFromJsonAsync<JsonElement>();
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}";
        Assert.False(trip.GetProperty("isFinished").GetBoolean());
        foreach (var action in new[] { "finish", "finish", "reopen", "reopen", "finish" })
        {
            var response = await client.PostAsync(url + "/" + action, null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(action == "finish", updated.GetProperty("isFinished").GetBoolean());
            Assert.Equal(startDate, updated.GetProperty("startDate").GetString());
            Assert.Equal(endDate, updated.GetProperty("endDate").GetString());
            Assert.Equal(action == "finish", (await client.GetFromJsonAsync<JsonElement>(url)).GetProperty("isFinished").GetBoolean());
            Assert.Equal(action == "finish", (await client.GetFromJsonAsync<JsonElement>("/trips"))[0].GetProperty("isFinished").GetBoolean());
        }
        var itemResponse = await client.PostAsJsonAsync(url + "/items", new { name = "Phone", category = "electronics" });
        Assert.Equal(HttpStatusCode.Created, itemResponse.StatusCode);
        var item = await itemResponse.Content.ReadFromJsonAsync<JsonElement>();
        var itemUrl = $"/items/{item.GetProperty("id").GetGuid()}";
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync(itemUrl, new { isPacked = true, notes = "Keep", itemCount = 2 })).StatusCode);
        await client.PostAsync(url + "/reopen", null);
        var preserved = await client.GetFromJsonAsync<JsonElement>(itemUrl);
        Assert.True(preserved.GetProperty("isPacked").GetBoolean());
        Assert.Equal("electronics", preserved.GetProperty("category").GetString());
        Assert.Equal("Keep", preserved.GetProperty("notes").GetString());
        Assert.Equal(2, preserved.GetProperty("itemCount").GetInt32());
        Assert.False((await client.GetFromJsonAsync<JsonElement>(url)).GetProperty("isFinished").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync(url + "/finish", null)).StatusCode);
    }

    [Theory]
    [InlineData("finish")]
    [InlineData("reopen")]
    public async Task Lifecycle_EnforcesIdentityOwnershipAndExistenceAsync(string action)
    {
        await using var factory = new TripApiFactory();
        using var owner = factory.CreateApiClient();
        owner.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await (await owner.PostAsJsonAsync("/trips", new { destination = "Lisbon" })).Content.ReadFromJsonAsync<JsonElement>();
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}/{action}";
        using var anonymous = factory.CreateApiClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync(url, null)).StatusCode);
        using var other = factory.CreateApiClient();
        other.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsync(url, null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.PostAsync($"/trips/{Guid.NewGuid()}/{action}", null)).StatusCode);
    }
}
