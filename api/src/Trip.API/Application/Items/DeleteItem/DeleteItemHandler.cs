using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.DeleteItem;

public sealed class DeleteItemHandler
{
    private readonly ITripRepository _tripRepository;
    private readonly IDomainOperationGate _operationGate;

    public DeleteItemHandler(ITripRepository tripRepository, IDomainOperationGate operationGate)
    {
        _tripRepository = tripRepository;
        _operationGate = operationGate;
    }

    public async Task HandleAsync(DeleteItemCommand command, CancellationToken cancellationToken)
    {
        using var operation = await _operationGate.AcquireAsync(cancellationToken).ConfigureAwait(false);
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
