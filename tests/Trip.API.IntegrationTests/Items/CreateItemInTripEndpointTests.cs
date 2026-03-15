using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class CreateItemInTripEndpointTests
{
    [Fact]
    public async Task CreateItemInTrip_ReturnsCreated_WhenTripIsOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Vienna");

        var response = await client.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = "Passport" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<ItemResponseContract>();
        Assert.Equal(trip.Id, item!.TripId);
        Assert.NotEqual(Guid.Empty, item.BaggageId);
    }

    [Fact]
    public async Task CreateItemInTrip_ReturnsNotFound_WhenTripDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.PostAsJsonAsync($"/trips/{Guid.NewGuid()}/items", new { name = "Passport" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateItemInTrip_ReturnsForbidden_WhenTripBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Berlin");

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = "Passport" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateItemInTrip_ReturnsBadRequest_WhenNameIsBlank()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Rome");

        var response = await client.PostAsJsonAsync($"/trips/{trip.Id}/items", new { name = " " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static async Task<TripResponseContract> CreateTripAsync(HttpClient client, string destination)
    {
        var response = await client.PostAsJsonAsync("/trips", new { destination });
        return (await response.Content.ReadFromJsonAsync<TripResponseContract>())!;
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
    private sealed record ItemResponseContract(Guid Id, Guid TripId, Guid BaggageId, string Name, int CheckCount, Guid? DefaultItemId);
}
