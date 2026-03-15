using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.GetItem;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Items;

public static class GetItemEndpoint
{
    public static IEndpointRouteBuilder MapGetItem(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
                "/items/{itemId:guid}",
                async Task<IResult> (
                    Guid itemId,
                    IUserContextAccessor userContextAccessor,
                    GetItemHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(GetItemEndpoint));
                    logger.GetItemRequestReceived(userId.Value, itemId);

                    var result = await handler.HandleAsync(
                        new GetItemQuery(userId, ItemId.FromGuid(itemId)),
                        cancellationToken);

                    var item = result.Item;
                    return Results.Ok(new ItemResponse(
                        item.Id,
                        item.TripId,
                        item.BaggageId,
                        item.Name,
                        item.CheckCount,
                        item.DefaultItemId));
                })
            .WithName(ItemEndpointNames.GetItem)
            .WithTags("Items");

        return endpoints;
    }
}
