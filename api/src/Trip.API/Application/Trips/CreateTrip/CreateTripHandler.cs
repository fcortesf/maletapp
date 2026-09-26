using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.Application.Trips.CreateTrip;

public sealed class CreateTripHandler
{
    private readonly ILogger<CreateTripHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public CreateTripHandler(ITripRepository tripRepository, ILogger<CreateTripHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<CreateTripResult> HandleAsync(CreateTripCommand command, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.NewTrip.Destination))
        {
            throw new ValidationException("Trip destination is required.");
        }

        if (command.NewTrip.StartDate.HasValue
            && command.NewTrip.EndDate.HasValue
            && command.NewTrip.StartDate > command.NewTrip.EndDate)
        {
            throw new ValidationException("Trip start date cannot be after end date.");
        }

        var trip = new TripEntity(
            TripId.CreateUnique(),
            command.UserId,
            command.NewTrip.Destination,
            command.NewTrip.StartDate,
            command.NewTrip.EndDate);

        _logger.LogInformation(
            "Creating trip {TripId} for user {UserId} heading to {Destination}",
            trip.Id.Value,
            command.UserId.Value,
            trip.Destination);

        await _tripRepository.AddAsync(trip, cancellationToken).ConfigureAwait(false);

        return new CreateTripResult(MapTrip(trip));
    }

    private static TripDto MapTrip(TripEntity trip)
    {
        return new TripDto(
            trip.Id.Value,
            trip.Destination,
            trip.StartDate,
            trip.EndDate);
    }
}
