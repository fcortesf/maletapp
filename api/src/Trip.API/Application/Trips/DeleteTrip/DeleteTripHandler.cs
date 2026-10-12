using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Trips.DeleteTrip;

public sealed class DeleteTripHandler
{
    private readonly ILogger<DeleteTripHandler> _logger;
    private readonly ITripRepository _tripRepository;
    private readonly IDomainOperationGate _operationGate;

    public DeleteTripHandler(ITripRepository tripRepository, ILogger<DeleteTripHandler> logger, IDomainOperationGate operationGate)
    {
        _tripRepository = tripRepository;
        _operationGate = operationGate;
        _logger = logger;
    }

    public async Task<DeleteTripResult> HandleAsync(DeleteTripCommand command, CancellationToken cancellationToken)
    {
        using var operation = await _operationGate.AcquireAsync(cancellationToken).ConfigureAwait(false);
        _logger.LogInformation(
            "Deleting trip {TripId} for user {UserId}",
            command.TripId.Value,
            command.UserId.Value);

        var trip = await _tripRepository.GetByIdAsync(command.TripId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Trip {command.TripId.Value} was not found.");
        }

        if (trip.OwnerId != command.UserId)
        {
            throw new ForbiddenException($"Trip {command.TripId.Value} is not accessible for the current user.");
        }

        await _tripRepository.DeleteAsync(command.TripId, cancellationToken).ConfigureAwait(false);

        return new DeleteTripResult();
    }
}
