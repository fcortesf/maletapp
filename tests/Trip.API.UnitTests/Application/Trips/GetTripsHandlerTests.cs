using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Trips.GetTrips;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Trips;

public sealed class GetTripsHandlerTests
{
    [Fact]
    public async Task HandleAsync_ReturnsOnlyTripsForRequestedUser()
    {
        var userId = TripFixtures.CreateUserId();
        var repository = new InMemoryTripRepository(
            TripFixtures.CreateTrip(userId, "Seville"),
            TripFixtures.CreateTrip(TripFixtures.CreateUserId(), "Paris"));
        var handler = new GetTripsHandler(repository, NullLogger<GetTripsHandler>.Instance);

        var result = await handler.HandleAsync(new GetTripsQuery(userId), CancellationToken.None);

        var trip = Assert.Single(result.Trips);
        Assert.Equal("Seville", trip.Destination);
    }

    [Fact]
    public async Task HandleAsync_ReturnsEmptyCollection_WhenUserHasNoTrips()
    {
        var handler = new GetTripsHandler(new InMemoryTripRepository(), NullLogger<GetTripsHandler>.Instance);

        var result = await handler.HandleAsync(new GetTripsQuery(TripFixtures.CreateUserId()), CancellationToken.None);

        Assert.Empty(result.Trips);
    }

    private sealed class InMemoryTripRepository : ITripRepository
    {
        private readonly IReadOnlyList<TripEntity> _trips;

        public InMemoryTripRepository(params TripEntity[] trips)
        {
            _trips = trips;
        }

        public Task AddAsync(TripEntity trip, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task<TripEntity?> GetByIdAsync(TripId tripId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_trips.SingleOrDefault(trip => trip.Id == tripId));
        }

        public Task<TripEntity?> GetTripByItemIdAsync(ItemId itemId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_trips.SingleOrDefault(trip => trip.FindItem(itemId) is not null));
        }

        public Task<IReadOnlyList<TripEntity>> GetByOwnerIdAsync(UserId ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TripEntity>>(_trips.Where(trip => trip.OwnerId == ownerId).ToArray());
        }

        public Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }
    }
}
