using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.GetItem;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Items;

public sealed class GetItemHandlerTests
{
    [Fact]
    public async Task HandleAsync_ReturnsItem_WhenOwnedByCurrentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new GetItemHandler(new InMemoryTripRepository(trip), NullLogger<GetItemHandler>.Instance);

        var result = await handler.HandleAsync(new GetItemQuery(trip.OwnerId, item.Id), CancellationToken.None);

        Assert.Equal(item.Id.Value, result.Item.Id);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFound_WhenItemDoesNotExist()
    {
        var handler = new GetItemHandler(new InMemoryTripRepository(), NullLogger<GetItemHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new GetItemQuery(TripFixtures.CreateUserId(), ItemId.CreateUnique()),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbidden_WhenItemBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new GetItemHandler(new InMemoryTripRepository(trip), NullLogger<GetItemHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new GetItemQuery(TripFixtures.CreateUserId(), item.Id),
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
        public Task DeleteAsync(TripId tripId, CancellationToken cancellationToken) => throw new NotSupportedException();
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
