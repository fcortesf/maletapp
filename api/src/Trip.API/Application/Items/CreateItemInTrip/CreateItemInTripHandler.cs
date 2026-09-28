using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.CreateItemInTrip;

public sealed class CreateItemInTripHandler
{
    private readonly ILogger<CreateItemInTripHandler> _logger;
    private readonly ITripRepository _tripRepository;
    private readonly IDomainOperationGate _operationGate;

    public CreateItemInTripHandler(ITripRepository tripRepository, ILogger<CreateItemInTripHandler> logger, IDomainOperationGate operationGate)
    {
        _tripRepository = tripRepository;
        _operationGate = operationGate;
        _logger = logger;
    }

    public async Task<CreateItemInTripResult> HandleAsync(CreateItemInTripCommand command, CancellationToken cancellationToken)
    {
        using var operation = await _operationGate.AcquireAsync(cancellationToken).ConfigureAwait(false);
        _logger.LogInformation("Creating item in trip {TripId} for user {UserId}", command.TripId.Value, command.UserId.Value);

        if (string.IsNullOrWhiteSpace(command.Item.Name))
        {
            throw new ValidationException("Item name is required.");
        }

        if (command.Item.ItemCount is <= 0)
            throw new ValidationException("Item count must be positive.");

        var category = ParseCategory(command.Item.Category);

        var trip = await _tripRepository.GetByIdAsync(command.TripId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Trip {command.TripId.Value} was not found.");
        }

        if (trip.OwnerId != command.UserId)
        {
            throw new ForbiddenException($"Trip {command.TripId.Value} is not accessible for the current user.");
        }

        var item = trip.AddItemToDefaultBaggage(command.Item.Name, command.Item.DefaultItemId, command.Item.Notes, command.Item.ItemCount);
        item.SetCategory(category);
        await _tripRepository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);

        return new CreateItemInTripResult(new ItemDto(
            item.Id.Value,
            item.TripId.Value,
            item.BaggageId.Value,
            item.Name,
            item.IsPacked,
            item.DefaultItemId,
            item.Notes,
            item.ItemCount,
            item.Category.Value));
    }
    private static Trip.API.Domain.ValueObjects.ItemCategory ParseCategory(string? value)
    {
        try { return Trip.API.Domain.ValueObjects.ItemCategory.Parse(value); }
        catch (ArgumentException) { throw new ValidationException("Category must be a supported lowercase code."); }
    }
}
