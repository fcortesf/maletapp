using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;

namespace Trip.API.Application.Trips.GetTrips;

public sealed class GetTripsHandler
{
    private readonly ILogger<GetTripsHandler> _logger;
    private readonly ITripRepository _tripRepository;
    private readonly IDomainOperationGate _operationGate;

    public GetTripsHandler(ITripRepository tripRepository, ILogger<GetTripsHandler> logger, IDomainOperationGate operationGate)
    {
        _tripRepository = tripRepository;
        _operationGate = operationGate;
        _logger = logger;
    }

    public async Task<GetTripsResult> HandleAsync(GetTripsQuery query, CancellationToken cancellationToken)
    {
        using var operation = await _operationGate.AcquireAsync(cancellationToken).ConfigureAwait(false);
        _logger.LogInformation("Retrieving trips for user {UserId}", query.UserId.Value);

        var trips = await _tripRepository
            .GetByOwnerIdAsync(query.UserId, cancellationToken)
            .ConfigureAwait(false);

        var tripDtos = trips
            .Select(trip => new TripDto(
                trip.Id.Value,
                trip.Destination,
                trip.StartDate,
                trip.EndDate, trip.IsFinished))
            .ToArray();

        return new GetTripsResult(tripDtos);
    }
}
