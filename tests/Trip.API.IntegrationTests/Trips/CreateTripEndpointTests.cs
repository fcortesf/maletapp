using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Trips;

public sealed class CreateTripEndpointTests
{
    [Fact]
    public async Task PostTrips_ReturnsCreatedTrip_WhenRequestIsValid()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.PostAsJsonAsync("/trips", new
        {
            destination = "Bilbao",
            startDate = new DateOnly(2026, 7, 10),
            endDate = new DateOnly(2026, 7, 20)
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var trip = await response.Content.ReadFromJsonAsync<TripResponseContract>();
        Assert.NotNull(trip);
        Assert.Equal("Bilbao", trip.Destination);
        Assert.NotEqual(Guid.Empty, trip.Id);
    }

    [Fact]
    public async Task PostTrips_ReturnsBadRequest_WhenDestinationIsMissing()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.PostAsJsonAsync("/trips", new
        {
            destination = "",
            startDate = (DateOnly?)null,
            endDate = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostTrips_ReturnsUnauthorized_WhenUserHeaderIsMissing()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();

        var response = await client.PostAsJsonAsync("/trips", new
        {
            destination = "Dublin"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
}
