using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Trips.GetTripById;

public sealed class GetTripByIdHandler
{
    private readonly ILogger<GetTripByIdHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public GetTripByIdHandler(ITripRepository tripRepository, ILogger<GetTripByIdHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<GetTripByIdResult> HandleAsync(GetTripByIdQuery query, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Retrieving trip {TripId} for user {UserId}",
            query.TripId.Value,
            query.UserId.Value);

        var trip = await _tripRepository.GetByIdAsync(query.TripId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Trip {query.TripId.Value} was not found.");
        }

        if (trip.OwnerId != query.UserId)
        {
            throw new ForbiddenException($"Trip {query.TripId.Value} is not accessible for the current user.");
        }

        return new GetTripByIdResult(new TripDto(
            trip.Id.Value,
            trip.Destination,
            trip.StartDate,
            trip.EndDate));
    }
}
