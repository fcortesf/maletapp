using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.CreateItemInTrip;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Items;

public sealed class CreateItemInTripHandlerTests
{
    [Fact]
    public async Task HandleAsync_CreatesItemInDefaultBaggage_WhenTripIsOwned()
    {
        var trip = TripFixtures.CreateTrip();
        var repository = new InMemoryTripRepository(trip);
        var handler = new CreateItemInTripHandler(repository, NullLogger<CreateItemInTripHandler>.Instance);

        var result = await handler.HandleAsync(
            new CreateItemInTripCommand(trip.OwnerId, trip.Id, new NewItemDto("Passport", null)),
            CancellationToken.None);

        Assert.Equal("Passport", result.Item.Name);
        Assert.True(repository.UpdateCalled);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFound_WhenTripIsMissing()
    {
        var handler = new CreateItemInTripHandler(new InMemoryTripRepository(), NullLogger<CreateItemInTripHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new CreateItemInTripCommand(TripFixtures.CreateUserId(), TripId.CreateUnique(), new NewItemDto("Passport", null)),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbidden_WhenTripBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var handler = new CreateItemInTripHandler(new InMemoryTripRepository(trip), NullLogger<CreateItemInTripHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new CreateItemInTripCommand(TripFixtures.CreateUserId(), trip.Id, new NewItemDto("Passport", null)),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsValidationException_WhenNameIsBlank()
    {
        var trip = TripFixtures.CreateTrip();
        var handler = new CreateItemInTripHandler(new InMemoryTripRepository(trip), NullLogger<CreateItemInTripHandler>.Instance);

        await Assert.ThrowsAsync<ValidationException>(() => handler.HandleAsync(
            new CreateItemInTripCommand(trip.OwnerId, trip.Id, new NewItemDto(" ", null)),
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
