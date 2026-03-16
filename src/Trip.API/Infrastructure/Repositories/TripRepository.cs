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
        await _dbContext.Trips.AddAsync(MapTripDataModel(trip), cancellationToken).ConfigureAwait(false);

        await _dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken)
    {
        var existingTrip = await _dbContext.Trips
            .Include(model => model.Baggages)
            .ThenInclude(model => model.Items)
            .SingleOrDefaultAsync(model => model.Id == trip.Id.Value, cancellationToken)
            .ConfigureAwait(false);

        if (existingTrip is null)
        {
            throw new InvalidOperationException($"Trip {trip.Id.Value} was not found for update.");
        }

        existingTrip.OwnerId = trip.OwnerId.Value;
        existingTrip.Destination = trip.Destination;
        existingTrip.StartDate = trip.StartDate;
        existingTrip.EndDate = trip.EndDate;

        _dbContext.Items.RemoveRange(existingTrip.Baggages.SelectMany(baggage => baggage.Items).ToList());
        _dbContext.Baggages.RemoveRange(existingTrip.Baggages.ToList());
        existingTrip.Baggages.Clear();

        foreach (var baggage in MapBaggageDataModels(trip))
        {
            existingTrip.Baggages.Add(baggage);
            _dbContext.Entry(baggage).State = EntityState.Added;

            foreach (var item in baggage.Items)
            {
                _dbContext.Entry(item).State = EntityState.Added;
            }
        }

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
            .Include(model => model.Baggages)
            .ThenInclude(model => model.Items)
            .SingleOrDefaultAsync(trip => trip.Id == tripId.Value, cancellationToken)
            .ConfigureAwait(false);

        return trip is null ? null : MapTrip(trip);
    }

    public async Task<TripEntity?> GetTripByItemIdAsync(ItemId itemId, CancellationToken cancellationToken)
    {
        var trip = await GetTripByItemIdInternalAsync(itemId, asNoTracking: true, cancellationToken).ConfigureAwait(false);

        return trip is null ? null : MapTrip(trip);
    }

    public async Task<TripEntity?> GetTripByItemIdForUpdateAsync(ItemId itemId, CancellationToken cancellationToken)
    {
        var trip = await GetTripByItemIdInternalAsync(itemId, asNoTracking: true, cancellationToken).ConfigureAwait(false);

        return trip is null ? null : MapTrip(trip);
    }

    private async Task<TripDataModel?> GetTripByItemIdInternalAsync(ItemId itemId, bool asNoTracking, CancellationToken cancellationToken)
    {
        var query = _dbContext.Trips
            .Include(model => model.Baggages)
            .ThenInclude(model => model.Items)
            .Where(trip => trip.Baggages.Any(baggage => baggage.Items.Any(item => item.Id == itemId.Value)));

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    private static TripEntity MapTrip(TripDataModel trip)
    {
        return TripEntity.Rehydrate(
            TripId.FromGuid(trip.Id),
            UserId.FromGuid(trip.OwnerId),
            trip.Destination,
            trip.StartDate,
            trip.EndDate,
            trip.Baggages.Select(MapBaggage));
    }

    private static Baggage MapBaggage(BaggageDataModel baggage)
    {
        return Baggage.Rehydrate(
            BaggageId.FromGuid(baggage.Id),
            TripId.FromGuid(baggage.TripId),
            baggage.Name,
            baggage.IsDefaultBaggage,
            baggage.Items.Select(MapItem));
    }

    private static Item MapItem(ItemDataModel item)
    {
        return Item.Rehydrate(
            ItemId.FromGuid(item.Id),
            TripId.FromGuid(item.TripId),
            BaggageId.FromGuid(item.BaggageId),
            item.Name,
            item.CheckCount,
            item.DefaultItemId);
    }

    private static TripDataModel MapTripDataModel(TripEntity trip)
    {
        return new TripDataModel
        {
            Id = trip.Id.Value,
            OwnerId = trip.OwnerId.Value,
            Destination = trip.Destination,
            StartDate = trip.StartDate,
            EndDate = trip.EndDate,
            Baggages = MapBaggageDataModels(trip).ToList()
        };
    }

    private static IEnumerable<BaggageDataModel> MapBaggageDataModels(TripEntity trip)
    {
        return trip.Baggages.Select(baggage => new BaggageDataModel
        {
            Id = baggage.Id.Value,
            TripId = baggage.TripId.Value,
            Name = baggage.Name,
            IsDefaultBaggage = baggage.IsDefaultBaggage,
            Items = baggage.Items.Select(item => new ItemDataModel
            {
                Id = item.Id.Value,
                TripId = item.TripId.Value,
                BaggageId = item.BaggageId.Value,
                Name = item.Name,
                CheckCount = item.CheckCount,
                DefaultItemId = item.DefaultItemId
            }).ToList()
        });
    }
}
