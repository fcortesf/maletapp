using Microsoft.Extensions.Logging.Abstractions;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.CreateTrip;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Application.Trips;

public sealed class CreateTripHandlerTests
{
    [Fact]
    public async Task HandleAsync_CreatesTrip_WhenCommandIsValid()
    {
        var repository = new InMemoryTripRepository();
        var handler = new CreateTripHandler(repository, NullLogger<CreateTripHandler>.Instance);
        var userId = TripFixtures.CreateUserId();

        var result = await handler.HandleAsync(
            new CreateTripCommand(
                userId,
                TripFixtures.CreateNewTripDto("Berlin", new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 4))),
            CancellationToken.None);

        Assert.Equal("Berlin", result.Trip.Destination);
        Assert.Single(repository.Trips);
        Assert.Equal(userId, repository.Trips[0].OwnerId);
    }

    [Fact]
    public async Task HandleAsync_ThrowsValidationException_WhenDestinationIsMissing()
    {
        var repository = new InMemoryTripRepository();
        var handler = new CreateTripHandler(repository, NullLogger<CreateTripHandler>.Instance);

        await Assert.ThrowsAsync<ValidationException>(() => handler.HandleAsync(
            new CreateTripCommand(TripFixtures.CreateUserId(), TripFixtures.CreateNewTripDto(" ")),
            CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_ThrowsValidationException_WhenDatesAreInvalid()
    {
        var repository = new InMemoryTripRepository();
        var handler = new CreateTripHandler(repository, NullLogger<CreateTripHandler>.Instance);

        await Assert.ThrowsAsync<ValidationException>(() => handler.HandleAsync(
            new CreateTripCommand(
                TripFixtures.CreateUserId(),
                TripFixtures.CreateNewTripDto("Rome", new DateOnly(2026, 6, 10), new DateOnly(2026, 6, 1))),
            CancellationToken.None));
    }

    private sealed class InMemoryTripRepository : ITripRepository
    {
        public List<TripEntity> Trips { get; } = new();

        public Task AddAsync(TripEntity trip, CancellationToken cancellationToken)
        {
            Trips.Add(trip);
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
    }
}
