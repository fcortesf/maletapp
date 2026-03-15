using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;

namespace Trip.API.Application.Items.ListItemsByTrip;

public sealed class ListItemsByTripHandler
{
    private readonly ILogger<ListItemsByTripHandler> _logger;
    private readonly ITripRepository _tripRepository;

    public ListItemsByTripHandler(ITripRepository tripRepository, ILogger<ListItemsByTripHandler> logger)
    {
        _tripRepository = tripRepository;
        _logger = logger;
    }

    public async Task<ListItemsByTripResult> HandleAsync(ListItemsByTripQuery query, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Listing items for trip {TripId} and user {UserId}", query.TripId.Value, query.UserId.Value);

        var trip = await _tripRepository.GetByIdAsync(query.TripId, cancellationToken).ConfigureAwait(false);

        if (trip is null)
        {
            throw new NotFoundException($"Trip {query.TripId.Value} was not found.");
        }

        if (trip.OwnerId != query.UserId)
        {
            throw new ForbiddenException($"Trip {query.TripId.Value} is not accessible for the current user.");
        }

        return new ListItemsByTripResult(trip.Items
            .Select(item => new ItemDto(
                item.Id.Value,
                item.TripId.Value,
                item.BaggageId.Value,
                item.Name,
                item.CheckCount,
                item.DefaultItemId))
            .ToArray());
    }
}
