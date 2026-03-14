using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Trips;

public sealed class GetTripByIdEndpointTests
{
    [Fact]
    public async Task GetTripById_ReturnsTrip_WhenOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var createResponse = await client.PostAsJsonAsync("/trips", new { destination = "Vienna" });
        var createdTrip = await createResponse.Content.ReadFromJsonAsync<TripResponseContract>();

        var response = await client.GetAsync($"/trips/{createdTrip!.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetTripById_ReturnsForbidden_WhenTripBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var createResponse = await ownerClient.PostAsJsonAsync("/trips", new { destination = "Athens" });
        var createdTrip = await createResponse.Content.ReadFromJsonAsync<TripResponseContract>();

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.GetAsync($"/trips/{createdTrip!.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetTripById_ReturnsNotFound_WhenTripDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/trips/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetTripById_ReturnsUnauthorized_WhenCurrentUserIsMissing()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var createResponse = await ownerClient.PostAsJsonAsync("/trips", new { destination = "Warsaw" });
        var createdTrip = await createResponse.Content.ReadFromJsonAsync<TripResponseContract>();

        using var anonymousClient = factory.CreateApiClient();
        var response = await anonymousClient.GetAsync($"/trips/{createdTrip!.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
}
