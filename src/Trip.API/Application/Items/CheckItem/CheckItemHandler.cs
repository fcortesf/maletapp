using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.CheckItem;

public sealed class CheckItemHandler
{
    private readonly ILogger<CheckItemHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public CheckItemHandler(ITripRepository tripRepository, ILogger<CheckItemHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<CheckItemResult> HandleAsync(CheckItemCommand command, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Checking item {ItemId} for user {UserId}", command.ItemId.Value, command.UserId.Value);

        var trip = await _tripRepository.GetTripByItemIdForUpdateAsync(command.ItemId, cancellationToken).ConfigureAwait(false);

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

        item.Check();

        await _tripRepository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);

        return new CheckItemResult(new ItemDto(
            item.Id.Value,
            item.TripId.Value,
            item.BaggageId.Value,
            item.Name,
            item.CheckCount,
            item.DefaultItemId));
    }
}
