using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.GetTripById;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Trips;

public sealed class GetTripByIdHandlerTests
{
    [Fact]
    public async Task HandleAsync_ReturnsTrip_WhenOwnedByCurrentUser()
    {
        var userId = TripFixtures.CreateUserId();
        var trip = TripFixtures.CreateTrip(userId, "Valencia");
        var handler = new GetTripByIdHandler(
            new InMemoryTripRepository(trip),
            NullLogger<GetTripByIdHandler>.Instance);

        var result = await handler.HandleAsync(new GetTripByIdQuery(userId, trip.Id), CancellationToken.None);

        Assert.Equal(trip.Id.Value, result.Trip.Id);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFoundException_WhenTripDoesNotExist()
    {
        var handler = new GetTripByIdHandler(
            new InMemoryTripRepository(),
            NullLogger<GetTripByIdHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new GetTripByIdQuery(TripFixtures.CreateUserId(), TripId.CreateUnique()),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbiddenException_WhenTripBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip(TripFixtures.CreateUserId(), "Oslo");
        var handler = new GetTripByIdHandler(
            new InMemoryTripRepository(trip),
            NullLogger<GetTripByIdHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new GetTripByIdQuery(TripFixtures.CreateUserId(), trip.Id),
            CancellationToken.None));
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

        public Task DeleteAsync(TripId tripId, CancellationToken cancellationToken)
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

        public Task<TripEntity?> GetTripByItemIdForUpdateAsync(ItemId itemId, CancellationToken cancellationToken)
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
