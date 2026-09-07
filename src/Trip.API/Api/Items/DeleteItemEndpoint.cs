using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.DeleteItem;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Items;

public static class DeleteItemEndpoint
{
    public static IEndpointRouteBuilder MapDeleteItem(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapDelete(
                "/items/{itemId:guid}",
                async Task<IResult> (
                    Guid itemId,
                    IUserContextAccessor userContextAccessor,
                    DeleteItemHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    await handler.HandleAsync(new DeleteItemCommand(userId, ItemId.FromGuid(itemId)), cancellationToken);
                    return Results.NoContent();
                })
            .WithName(ItemEndpointNames.DeleteItem)
            .Produces(204)
            .WithTags("Items");

        return endpoints;
    }
}
