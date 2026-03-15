using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.GetItem;

public sealed class GetItemHandler
{
    private readonly ILogger<GetItemHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public GetItemHandler(ITripRepository tripRepository, ILogger<GetItemHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<GetItemResult> HandleAsync(GetItemQuery query, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Retrieving item {ItemId} for user {UserId}", query.ItemId.Value, query.UserId.Value);

        var trip = await _tripRepository.GetTripByItemIdAsync(query.ItemId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Item {query.ItemId.Value} was not found.");
        }

        if (trip.OwnerId != query.UserId)
        {
            throw new ForbiddenException($"Item {query.ItemId.Value} is not accessible for the current user.");
        }

        var item = trip.FindItem(query.ItemId)
            ?? throw new NotFoundException($"Item {query.ItemId.Value} was not found.");

        return new GetItemResult(new ItemDto(
            item.Id.Value,
            item.TripId.Value,
            item.BaggageId.Value,
            item.Name,
            item.CheckCount,
            item.DefaultItemId));
    }
}
