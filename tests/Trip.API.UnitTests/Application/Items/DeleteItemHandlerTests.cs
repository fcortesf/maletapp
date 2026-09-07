using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.DeleteItem;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Items;

public sealed class DeleteItemHandlerTests
{
    [Fact]
    public async Task HandleAsync_RemovesOnlyOwnedItem_AndPersistsAsync()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Remove");
        var kept = trip.AddItemToDefaultBaggage("Keep");
        var repository = new InMemoryTripRepository(trip);
        var handler = new DeleteItemHandler(repository);
        await handler.HandleAsync(new DeleteItemCommand(trip.OwnerId, item.Id), CancellationToken.None);
        Assert.Null(trip.FindItem(item.Id));
        Assert.Same(kept, trip.FindItem(kept.Id));
        Assert.True(repository.UpdateCalled);
    }

    [Fact]
    public async Task HandleAsync_RejectsOtherOwner_WithoutPersistenceAsync()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Keep");
        var repository = new InMemoryTripRepository(trip);
        var handler = new DeleteItemHandler(repository);
        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new DeleteItemCommand(TripFixtures.CreateUserId(), item.Id), CancellationToken.None));
        Assert.Same(item, trip.FindItem(item.Id));
        Assert.False(repository.UpdateCalled);
    }

    [Fact]
    public async Task HandleAsync_RejectsMissingItemAsync()
    {
        var handler = new DeleteItemHandler(new InMemoryTripRepository());
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new DeleteItemCommand(TripFixtures.CreateUserId(), ItemId.CreateUnique()), CancellationToken.None));
    }

    private sealed class InMemoryTripRepository : ITripRepository
    {
        private readonly List<TripEntity> _trips;

        public bool UpdateCalled { get; private set; }

        public InMemoryTripRepository(params TripEntity[] trips)
        {
            _trips = trips.ToList();
        }

        public Task AddAsync(TripEntity trip, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task DeleteAsync(TripId tripId, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken)
        {
            UpdateCalled = true;
            return Task.CompletedTask;
        }

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
