using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.ListItemsByTrip;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Items;

public sealed class ListItemsByTripHandlerTests
{
    [Fact]
    public async Task HandleAsync_ReturnsItems_WhenTripIsOwnedByCurrentUser()
    {
        var trip = TripFixtures.CreateTrip();
        trip.AddItemToDefaultBaggage("Passport");
        trip.AddItemToDefaultBaggage("Shoes");

        var handler = new ListItemsByTripHandler(new InMemoryTripRepository(trip), NullLogger<ListItemsByTripHandler>.Instance);

        var result = await handler.HandleAsync(new ListItemsByTripQuery(trip.OwnerId, trip.Id), CancellationToken.None);

        Assert.Equal(2, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFound_WhenTripIsMissing()
    {
        var handler = new ListItemsByTripHandler(new InMemoryTripRepository(), NullLogger<ListItemsByTripHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new ListItemsByTripQuery(TripFixtures.CreateUserId(), TripId.CreateUnique()),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbidden_WhenTripBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var handler = new ListItemsByTripHandler(new InMemoryTripRepository(trip), NullLogger<ListItemsByTripHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new ListItemsByTripQuery(TripFixtures.CreateUserId(), trip.Id),
            CancellationToken.None));
    }

    private sealed class InMemoryTripRepository : ITripRepository
    {
        private readonly List<TripEntity> _trips;

        public InMemoryTripRepository(params TripEntity[] trips)
        {
            _trips = trips.ToList();
        }

        public Task AddAsync(TripEntity trip, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<TripEntity?> GetByIdAsync(TripId tripId, CancellationToken cancellationToken)
            => Task.FromResult(_trips.SingleOrDefault(trip => trip.Id == tripId));

        public Task<IReadOnlyList<TripEntity>> GetByOwnerIdAsync(UserId ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<TripEntity>>(_trips.Where(trip => trip.OwnerId == ownerId).ToArray());

        public Task<TripEntity?> GetTripByItemIdAsync(ItemId itemId, CancellationToken cancellationToken)
            => Task.FromResult(_trips.SingleOrDefault(trip => trip.FindItem(itemId) is not null));

        public Task<TripEntity?> GetTripByItemIdForUpdateAsync(ItemId itemId, CancellationToken cancellationToken)
            => Task.FromResult(_trips.SingleOrDefault(trip => trip.FindItem(itemId) is not null));
    }
}
