using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class ListItemsByTripEndpointTests
{
    [Fact]
    public async Task ListItemsByTrip_ReturnsItems_WhenTripIsOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var trip = await CreateTripAsync(client, "Vienna");
        await client.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = "Passport" });
        await client.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = "Shoes" });

        var response = await client.GetAsync($"/trips/{trip.Id}/items");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<ItemResponseContract[]>();
        Assert.Equal(2, items!.Length);
    }

    [Fact]
    public async Task ListItemsByTrip_ReturnsEmptyArray_WhenTripHasNoItems()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var trip = await CreateTripAsync(client, "Prague");

        var response = await client.GetAsync($"/trips/{trip.Id}/items");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<ItemResponseContract[]>();
        Assert.Empty(items!);
    }

    [Fact]
    public async Task ListItemsByTrip_ReturnsNotFound_WhenTripDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/trips/{Guid.NewGuid()}/items");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListItemsByTrip_ReturnsForbidden_WhenTripBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Budapest");

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.GetAsync($"/trips/{trip.Id}/items");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task<TripResponseContract> CreateTripAsync(HttpClient client, string destination)
    {
        var response = await client.PostAsJsonAsync("/trips", new { destination });
        return (await response.Content.ReadFromJsonAsync<TripResponseContract>())!;
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
    private sealed record ItemResponseContract(Guid Id, Guid TripId, Guid BaggageId, string Name, int CheckCount, Guid? DefaultItemId);
}
