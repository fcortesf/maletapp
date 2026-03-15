using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.ListItemsByTrip;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Items;

public static class ListItemsByTripEndpoint
{
    public static IEndpointRouteBuilder MapListItemsByTrip(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
                "/trips/{tripId:guid}/items",
                async Task<IResult> (
                    Guid tripId,
                    IUserContextAccessor userContextAccessor,
                    ListItemsByTripHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(ListItemsByTripEndpoint));
                    logger.ListItemsByTripRequestReceived(userId.Value, tripId);

                    var result = await handler.HandleAsync(
                        new ListItemsByTripQuery(userId, TripId.FromGuid(tripId)),
                        cancellationToken);

                    return Results.Ok(result.Items
                        .Select(item => new ItemResponse(
                            item.Id,
                            item.TripId,
                            item.BaggageId,
                            item.Name,
                            item.CheckCount,
                            item.DefaultItemId)));
                })
            .WithName(ItemEndpointNames.ListItemsByTrip)
            .WithTags("Items");

        return endpoints;
    }
}
