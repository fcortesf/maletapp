using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.Application.Abstractions;

public interface ITripRepository
{
    Task AddAsync(TripEntity trip, CancellationToken cancellationToken);

    Task DeleteAsync(TripId tripId, CancellationToken cancellationToken);

    Task UpdateAsync(TripEntity trip, CancellationToken cancellationToken);

    Task<IReadOnlyList<TripEntity>> GetByOwnerIdAsync(UserId ownerId, CancellationToken cancellationToken);

    Task<TripEntity?> GetByIdAsync(TripId tripId, CancellationToken cancellationToken);

    Task<TripEntity?> GetTripByItemIdAsync(ItemId itemId, CancellationToken cancellationToken);

    Task<TripEntity?> GetTripByItemIdForUpdateAsync(ItemId itemId, CancellationToken cancellationToken);
}
