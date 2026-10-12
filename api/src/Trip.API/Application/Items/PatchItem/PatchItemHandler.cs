using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.PatchItem;

public sealed class PatchItemHandler
{
    private readonly ILogger<PatchItemHandler> _logger;
    private readonly ITripRepository _tripRepository;
    private readonly IDomainOperationGate _operationGate;

    public PatchItemHandler(ITripRepository tripRepository, ILogger<PatchItemHandler> logger, IDomainOperationGate operationGate)
    {
        _tripRepository = tripRepository;
        _operationGate = operationGate;
        _logger = logger;
    }

    public async Task<PatchItemResult> HandleAsync(PatchItemCommand command, CancellationToken cancellationToken)
    {
        using var operation = await _operationGate.AcquireAsync(cancellationToken).ConfigureAwait(false);
        _logger.LogInformation("Patching item {ItemId} for user {UserId}", command.ItemId.Value, command.UserId.Value);

        var trip = await _tripRepository.GetTripByItemIdAsync(command.ItemId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Item {command.ItemId.Value} was not found.");
        }

        if (trip.OwnerId != command.UserId)
        {
            throw new ForbiddenException($"Item {command.ItemId.Value} is not accessible for the current user.");
        }

        var item = trip.FindItem(command.ItemId)
            ?? throw new NotFoundException($"Item {command.ItemId.Value} was not found.");

        if (command.Item.HasItemCount && command.Item.ItemCount is <= 0)
            throw new ValidationException("Item count must be positive.");

        var category = command.Item.HasCategory ? ParseCategory(command.Item.Category) : null;

        if (command.Item.HasName)
        {
            if (string.IsNullOrWhiteSpace(command.Item.Name))
            {
                throw new ValidationException("Item name cannot be empty.");
            }

            item.Rename(command.Item.Name!);
        }

        if (category is not null) item.SetCategory(category);

        if (command.Item.HasDefaultItemId)
        {
            item.UpdateDefaultItemId(command.Item.DefaultItemId);
        }

        if (command.Item.HasIsPacked)
        {
            item.SetPackedState(command.Item.IsPacked);
        }

        if (command.Item.HasNotes) item.UpdateNotes(command.Item.Notes);
        if (command.Item.HasItemCount) item.SetItemCount(command.Item.ItemCount);

        await _tripRepository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);

        return new PatchItemResult(new ItemDto(
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
