using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Trips;

public sealed class GetTripsEndpointTests
{
    [Fact]
    public async Task GetTrips_ReturnsOnlyTripsForCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        var currentUserId = Guid.NewGuid();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, currentUserId.ToString());

        await client.PostAsJsonAsync("/trips", new { destination = "London" });

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        await otherClient.PostAsJsonAsync("/trips", new { destination = "Prague" });

        var response = await client.GetAsync("/trips");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trips = await response.Content.ReadFromJsonAsync<TripResponseContract[]>();
        Assert.NotNull(trips);
        var trip = Assert.Single(trips);
        Assert.Equal("London", trip.Destination);
    }

    [Fact]
    public async Task GetTrips_ReturnsEmptyArray_WhenCurrentUserHasNoTrips()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.GetAsync("/trips");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trips = await response.Content.ReadFromJsonAsync<TripResponseContract[]>();
        Assert.NotNull(trips);
        Assert.Empty(trips);
    }

    [Fact]
    public async Task GetTrips_ReturnsUnauthorized_WhenCurrentUserIsMissing()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();

        var response = await client.GetAsync("/trips");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
}
