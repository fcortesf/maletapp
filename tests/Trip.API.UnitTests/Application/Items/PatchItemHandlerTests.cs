using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.PatchItem;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Items;

public sealed class PatchItemHandlerTests
{
    [Fact]
    public async Task HandleAsync_UpdatesAllowedFields_WhenOwnedByCurrentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var repository = new InMemoryTripRepository(trip);
        var handler = new PatchItemHandler(repository, NullLogger<PatchItemHandler>.Instance);
        var newDefaultItemId = Guid.NewGuid();

        var result = await handler.HandleAsync(
            new PatchItemCommand(trip.OwnerId, item.Id, new PatchItemDto("Updated Passport", true, newDefaultItemId, true)),
            CancellationToken.None);

        Assert.Equal("Updated Passport", result.Item.Name);
        Assert.Equal(newDefaultItemId, result.Item.DefaultItemId);
        Assert.True(repository.UpdateCalled);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFound_WhenItemIsMissing()
    {
        var handler = new PatchItemHandler(new InMemoryTripRepository(), NullLogger<PatchItemHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new PatchItemCommand(TripFixtures.CreateUserId(), ItemId.CreateUnique(), new PatchItemDto("Passport", true, null, false)),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbidden_WhenItemBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new PatchItemHandler(new InMemoryTripRepository(trip), NullLogger<PatchItemHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new PatchItemCommand(TripFixtures.CreateUserId(), item.Id, new PatchItemDto("Passport", true, null, false)),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsValidationException_WhenNameIsBlank()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var handler = new PatchItemHandler(new InMemoryTripRepository(trip), NullLogger<PatchItemHandler>.Instance);

        await Assert.ThrowsAsync<ValidationException>(() => handler.HandleAsync(
            new PatchItemCommand(trip.OwnerId, item.Id, new PatchItemDto(" ", true, null, false)),
            CancellationToken.None));
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
