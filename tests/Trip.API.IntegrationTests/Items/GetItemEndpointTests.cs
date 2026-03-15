using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class GetItemEndpointTests
{
    [Fact]
    public async Task GetItem_ReturnsItem_WhenOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Lisbon");
        var item = await CreateItemAsync(client, trip.Id, "Passport");

        var response = await client.GetAsync($"/items/{item.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetItem_ReturnsNotFound_WhenItemDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/items/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetItem_ReturnsForbidden_WhenItemBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Oslo");
        var item = await CreateItemAsync(ownerClient, trip.Id, "Passport");

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.GetAsync($"/items/{item.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task<TripResponseContract> CreateTripAsync(HttpClient client, string destination)
    {
        var response = await client.PostAsJsonAsync("/trips", new { destination });
        return (await response.Content.ReadFromJsonAsync<TripResponseContract>())!;
    }

    private static async Task<ItemResponseContract> CreateItemAsync(HttpClient client, Guid tripId, string name)
    {
        var response = await client.PostAsJsonAsync($"/trips/{tripId}/items", new { name });
        return (await response.Content.ReadFromJsonAsync<ItemResponseContract>())!;
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
    private sealed record ItemResponseContract(Guid Id, Guid TripId, Guid BaggageId, string Name, int CheckCount, Guid? DefaultItemId);
}
