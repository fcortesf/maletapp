using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.PatchItem;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Items;

public static class PatchItemEndpoint
{
    public static IEndpointRouteBuilder MapPatchItem(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapMethods(
                "/items/{itemId:guid}",
                new[] { "PATCH" },
                async Task<IResult> (
                    Guid itemId,
                    PatchItemRequest request,
                    IUserContextAccessor userContextAccessor,
                    PatchItemHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(PatchItemEndpoint));
                    logger.PatchItemRequestReceived(userId.Value, itemId);

                    var result = await handler.HandleAsync(
                        new PatchItemCommand(
                            userId,
                            ItemId.FromGuid(itemId),
                            new PatchItemDto(
                                request.Name,
                                request.HasName,
                                request.DefaultItemId,
                                request.HasDefaultItemId)),
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
            .WithName(ItemEndpointNames.PatchItem)
            .WithTags("Items");

        return endpoints;
    }
}
