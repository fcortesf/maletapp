using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.PatchItem;

public sealed class PatchItemHandler
{
    private readonly ILogger<PatchItemHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public PatchItemHandler(ITripRepository tripRepository, ILogger<PatchItemHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<PatchItemResult> HandleAsync(PatchItemCommand command, CancellationToken cancellationToken)
    {
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

        if (command.Item.HasName)
        {
            if (string.IsNullOrWhiteSpace(command.Item.Name))
            {
                throw new ValidationException("Item name cannot be empty.");
            }

            item.Rename(command.Item.Name!);
        }

        if (command.Item.HasDefaultItemId)
        {
            item.UpdateDefaultItemId(command.Item.DefaultItemId);
        }

        await _tripRepository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);

        return new PatchItemResult(new ItemDto(
            item.Id.Value,
            item.TripId.Value,
            item.BaggageId.Value,
            item.Name,
            item.CheckCount,
            item.DefaultItemId));
    }
}
