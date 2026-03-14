using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;

namespace Trip.API.Application.Trips.GetTrips;

public sealed class GetTripsHandler
{
    private readonly ILogger<GetTripsHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public GetTripsHandler(ITripRepository tripRepository, ILogger<GetTripsHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<GetTripsResult> HandleAsync(GetTripsQuery query, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Retrieving trips for user {UserId}", query.UserId.Value);

        var trips = await _tripRepository
            .GetByOwnerIdAsync(query.UserId, cancellationToken)
            .ConfigureAwait(false);

        var tripDtos = trips
            .Select(trip => new TripDto(
                trip.Id.Value,
                trip.Destination,
                trip.StartDate,
                trip.EndDate))
            .ToArray();

        return new GetTripsResult(tripDtos);
    }
}
