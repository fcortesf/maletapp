using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Trips;

public sealed class DeleteTripEndpointTests
{
    [Fact]
    public async Task DeleteTrip_ReturnsNoContent_WhenTripIsOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Helsinki");

        var response = await client.DeleteAsync($"/trips/{trip.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTrip_RemovesTripFromSubsequentGetById_WhenTripIsOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Tallinn");

        await client.DeleteAsync($"/trips/{trip.Id}");
        var response = await client.GetAsync($"/trips/{trip.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTrip_ReturnsNotFound_WhenTripDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.DeleteAsync($"/trips/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTrip_ReturnsForbidden_WhenTripBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Athens");

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.DeleteAsync($"/trips/{trip.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTrip_ReturnsUnauthorized_WhenCurrentUserIsMissing()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Warsaw");

        using var anonymousClient = factory.CreateApiClient();
        var response = await anonymousClient.DeleteAsync($"/trips/{trip.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteTrip_DeletesOnlyTargetTrip_WhenMultipleTripsExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var deletedTrip = await CreateTripAsync(client, "Bern");
        var preservedTrip = await CreateTripAsync(client, "Zurich");
        var preservedItem = await CreateItemAsync(client, preservedTrip.Id, "Passport");

        var deleteResponse = await client.DeleteAsync($"/trips/{deletedTrip.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var deletedTripResponse = await client.GetAsync($"/trips/{deletedTrip.Id}");
        var preservedTripResponse = await client.GetAsync($"/trips/{preservedTrip.Id}");
        var preservedItemResponse = await client.GetAsync($"/items/{preservedItem.Id}");

        Assert.Equal(HttpStatusCode.NotFound, deletedTripResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, preservedTripResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, preservedItemResponse.StatusCode);
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
