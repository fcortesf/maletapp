using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.CheckItem;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Items;

public static class CheckItemEndpoint
{
    public static IEndpointRouteBuilder MapCheckItem(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost(
                "/items/{itemId:guid}/check-item",
                async Task<IResult> (
                    Guid itemId,
                    IUserContextAccessor userContextAccessor,
                    CheckItemHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(CheckItemEndpoint));
                    logger.CheckItemRequestReceived(userId.Value, itemId);

                    var result = await handler.HandleAsync(
                        new CheckItemCommand(userId, ItemId.FromGuid(itemId)),
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
            .WithName(ItemEndpointNames.CheckItem)
            .WithTags("Items");

        return endpoints;
    }
}
