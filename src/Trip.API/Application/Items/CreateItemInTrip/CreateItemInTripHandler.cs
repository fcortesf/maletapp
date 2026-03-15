using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.CreateItemInTrip;

public sealed class CreateItemInTripHandler
{
    private readonly ILogger<CreateItemInTripHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public CreateItemInTripHandler(ITripRepository tripRepository, ILogger<CreateItemInTripHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<CreateItemInTripResult> HandleAsync(CreateItemInTripCommand command, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating item in trip {TripId} for user {UserId}", command.TripId.Value, command.UserId.Value);

        if (string.IsNullOrWhiteSpace(command.Item.Name))
        {
            throw new ValidationException("Item name is required.");
        }

        var trip = await _tripRepository.GetByIdAsync(command.TripId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Trip {command.TripId.Value} was not found.");
        }

        if (trip.OwnerId != command.UserId)
        {
            throw new ForbiddenException($"Trip {command.TripId.Value} is not accessible for the current user.");
        }

        var item = trip.AddItemToDefaultBaggage(command.Item.Name, command.Item.DefaultItemId);
        await _tripRepository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);

        return new CreateItemInTripResult(new ItemDto(
            item.Id.Value,
            item.TripId.Value,
            item.BaggageId.Value,
            item.Name,
            item.CheckCount,
            item.DefaultItemId));
    }
}
