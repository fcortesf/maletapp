using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.CheckItem;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Items;

public sealed class CheckItemHandlerTests
{
    [Fact]
    public async Task HandleAsync_ReturnsUpdatedItem_WhenOwnedByCurrentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new CheckItemHandler(new InMemoryTripRepository(trip), NullLogger<CheckItemHandler>.Instance);

        var result = await handler.HandleAsync(new CheckItemCommand(trip.OwnerId, item.Id), CancellationToken.None);

        Assert.Equal(item.Id.Value, result.Item.Id);
        Assert.Equal(1, result.Item.CheckCount);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFound_WhenItemDoesNotExist()
    {
        var handler = new CheckItemHandler(new InMemoryTripRepository(), NullLogger<CheckItemHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new CheckItemCommand(TripFixtures.CreateUserId(), ItemId.CreateUnique()),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbidden_WhenItemBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new CheckItemHandler(new InMemoryTripRepository(trip), NullLogger<CheckItemHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new CheckItemCommand(TripFixtures.CreateUserId(), item.Id),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_CanIncrementSameItemMultipleTimes()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new CheckItemHandler(new InMemoryTripRepository(trip), NullLogger<CheckItemHandler>.Instance);

        await handler.HandleAsync(new CheckItemCommand(trip.OwnerId, item.Id), CancellationToken.None);
        var result = await handler.HandleAsync(new CheckItemCommand(trip.OwnerId, item.Id), CancellationToken.None);

        Assert.Equal(2, result.Item.CheckCount);
    }

    private sealed class InMemoryTripRepository : ITripRepository
    {
        private readonly List<TripEntity> _trips;

        public InMemoryTripRepository(params TripEntity[] trips)
        {
            _trips = trips.ToList();
        }

        public Task AddAsync(TripEntity trip, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task DeleteAsync(TripId tripId, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken) => Task.CompletedTask;

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
