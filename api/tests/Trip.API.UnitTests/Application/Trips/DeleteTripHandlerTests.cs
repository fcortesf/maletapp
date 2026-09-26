using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.DeleteTrip;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Trips;

public sealed class DeleteTripHandlerTests
{
    [Fact]
    public async Task HandleAsync_DeletesTrip_WhenOwnedByCurrentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var repository = new InMemoryTripRepository(trip);
        var handler = new DeleteTripHandler(repository, NullLogger<DeleteTripHandler>.Instance);

        await handler.HandleAsync(new DeleteTripCommand(trip.OwnerId, trip.Id), CancellationToken.None);

        Assert.True(repository.DeleteCalled);
        Assert.Empty(repository.Trips);
    }

    [Fact]
    public async Task HandleAsync_DeletesTripWithNestedItems_WhenOwnedByCurrentUser()
    {
        var trip = TripFixtures.CreateTripWithItem();
        var repository = new InMemoryTripRepository(trip);
        var handler = new DeleteTripHandler(repository, NullLogger<DeleteTripHandler>.Instance);

        await handler.HandleAsync(new DeleteTripCommand(trip.OwnerId, trip.Id), CancellationToken.None);

        Assert.True(repository.DeleteCalled);
        Assert.Empty(repository.Trips);
    }

    [Fact]
    public async Task HandleAsync_ThrowsNotFound_WhenTripDoesNotExist()
    {
        var handler = new DeleteTripHandler(new InMemoryTripRepository(), NullLogger<DeleteTripHandler>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(
            new DeleteTripCommand(TripFixtures.CreateUserId(), TripId.CreateUnique()),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsForbidden_WhenTripBelongsToDifferentUser()
    {
        var trip = TripFixtures.CreateTrip();
        var handler = new DeleteTripHandler(new InMemoryTripRepository(trip), NullLogger<DeleteTripHandler>.Instance);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(
            new DeleteTripCommand(TripFixtures.CreateUserId(), trip.Id),
            CancellationToken.None));
    }

    private sealed class InMemoryTripRepository : ITripRepository
    {
        public List<TripEntity> Trips { get; }
        public bool DeleteCalled { get; private set; }

        public InMemoryTripRepository(params TripEntity[] trips)
        {
            Trips = trips.ToList();
        }

        public Task AddAsync(TripEntity trip, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task DeleteAsync(TripId tripId, CancellationToken cancellationToken)
        {
            DeleteCalled = true;
            Trips.RemoveAll(trip => trip.Id == tripId);
            return Task.CompletedTask;
        }

        public Task<TripEntity?> GetByIdAsync(TripId tripId, CancellationToken cancellationToken)
        {
            return Task.FromResult(Trips.SingleOrDefault(trip => trip.Id == tripId));
        }

        public Task<IReadOnlyList<TripEntity>> GetByOwnerIdAsync(UserId ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TripEntity>>(Trips.Where(trip => trip.OwnerId == ownerId).ToArray());
        }

        public Task<TripEntity?> GetTripByItemIdAsync(ItemId itemId, CancellationToken cancellationToken)
        {
            return Task.FromResult(Trips.SingleOrDefault(trip => trip.FindItem(itemId) is not null));
        }

        public Task<TripEntity?> GetTripByItemIdForUpdateAsync(ItemId itemId, CancellationToken cancellationToken)
        {
            return Task.FromResult(Trips.SingleOrDefault(trip => trip.FindItem(itemId) is not null));
        }

        public Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }
    }
}
