using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class DeleteItemEndpointTests
{
    [Fact]
    public async Task DeleteItem_EnforcesOwnership_AndPreservesOtherItemsAsync()
    {
        await using var factory = new TripApiFactory();
        using var owner = factory.CreateApiClient();
        owner.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var createdTrip = await owner.PostAsJsonAsync("/trips", new { destination = "MCP deletion test" });
        var trip = await createdTrip.Content.ReadFromJsonAsync<Identifier>();
        Assert.NotNull(trip);
        var createdItem = await owner.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = "Remove me" });
        var item = await createdItem.Content.ReadFromJsonAsync<Identifier>();
        Assert.NotNull(item);
        var createdOther = await owner.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = "Keep me" });
        var other = await createdOther.Content.ReadFromJsonAsync<Identifier>();
        Assert.NotNull(other);
        await owner.PatchAsJsonAsync($"/items/{other.Id}", new { isPacked = true });
        await owner.PostAsync($"/items/{other.Id}/check-item", null);

        using var anonymous = factory.CreateApiClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"/items/{item.Id}")).StatusCode);
        using var stranger = factory.CreateApiClient();
        stranger.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await stranger.DeleteAsync($"/items/{item.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/items/{item.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/items/{item.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync($"/items/{item.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.DeleteAsync($"/items/{item.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/trips/{trip.Id}")).StatusCode);
        var remaining = await owner.GetFromJsonAsync<List<ItemContract>>($"/trips/{trip.Id}/items");
        Assert.NotNull(remaining);
        var kept = Assert.Single(remaining);
        Assert.Equal(other.Id, kept.Id);
        Assert.True(kept.IsPacked);
        Assert.Equal(1, kept.CheckCount);
    }

    private sealed record Identifier(Guid Id);
    private sealed record ItemContract(Guid Id, bool IsPacked, int CheckCount);
}
