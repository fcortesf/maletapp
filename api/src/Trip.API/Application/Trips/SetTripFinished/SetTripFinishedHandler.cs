using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Trips.SetTripFinished;

public sealed class SetTripFinishedHandler(ITripRepository repository, IDomainOperationGate operationGate)
{
    public async Task<TripDto> HandleAsync(UserId userId, TripId tripId, bool isFinished, CancellationToken cancellationToken)
    {
        using var operation = await operationGate.AcquireAsync(cancellationToken).ConfigureAwait(false);
        var trip = await repository.GetByIdAsync(tripId, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException($"Trip {tripId.Value} was not found.");
        if (trip.OwnerId != userId)
            throw new ForbiddenException($"Trip {tripId.Value} is not accessible for the current user.");

        trip.SetFinishedState(isFinished);
        await repository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);
        return new TripDto(trip.Id.Value, trip.Destination, trip.StartDate, trip.EndDate, trip.IsFinished);
    }
}
