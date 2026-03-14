using Microsoft.EntityFrameworkCore;
using Trip.API.Application.Abstractions;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.Infrastructure.Persistence;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.Infrastructure.Repositories;

public sealed class TripRepository : ITripRepository
{
    private readonly TripDbContext _dbContext;

    public TripRepository(TripDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(TripEntity trip, CancellationToken cancellationToken)
    {
        await _dbContext.Trips.AddAsync(
            new TripDataModel
            {
                Id = trip.Id.Value,
                OwnerId = trip.OwnerId.Value,
                Destination = trip.Destination,
                StartDate = trip.StartDate,
                EndDate = trip.EndDate
            },
            cancellationToken).ConfigureAwait(false);

        await _dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<TripEntity>> GetByOwnerIdAsync(UserId ownerId, CancellationToken cancellationToken)
    {
        var trips = await _dbContext.Trips
            .AsNoTracking()
            .Where(trip => trip.OwnerId == ownerId.Value)
            .OrderBy(trip => trip.StartDate)
            .ThenBy(trip => trip.Destination)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return trips.Select(MapTrip).ToArray();
    }

    public async Task<TripEntity?> GetByIdAsync(TripId tripId, CancellationToken cancellationToken)
    {
        var trip = await _dbContext.Trips
            .AsNoTracking()
            .SingleOrDefaultAsync(trip => trip.Id == tripId.Value, cancellationToken)
            .ConfigureAwait(false);

        return trip is null ? null : MapTrip(trip);
    }

    private static TripEntity MapTrip(TripDataModel trip)
    {
        return new TripEntity(
            TripId.FromGuid(trip.Id),
            UserId.FromGuid(trip.OwnerId),
            trip.Destination,
            trip.StartDate,
            trip.EndDate);
    }
}
