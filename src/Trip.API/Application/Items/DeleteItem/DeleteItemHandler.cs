using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.DeleteItem;

public sealed class DeleteItemHandler
{
    private readonly ITripRepository _tripRepository;

    public DeleteItemHandler(ITripRepository tripRepository)
    {
        _tripRepository = tripRepository;
    }

    public async Task HandleAsync(DeleteItemCommand command, CancellationToken cancellationToken)
    {
        var trip = await _tripRepository.GetTripByItemIdAsync(command.ItemId, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException($"Item {command.ItemId.Value} was not found.");

        if (trip.OwnerId != command.UserId)
        {
            throw new ForbiddenException($"Item {command.ItemId.Value} is not accessible for the current user.");
        }

        if (!trip.RemoveItem(command.ItemId))
        {
            throw new NotFoundException($"Item {command.ItemId.Value} was not found.");
        }

        await _tripRepository.UpdateAsync(trip, cancellationToken).ConfigureAwait(false);
    }
}
