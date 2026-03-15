using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Items.CreateItemInTrip;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Items;

public static class CreateItemInTripEndpoint
{
    public static IEndpointRouteBuilder MapCreateItemInTrip(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost(
                "/trips/{tripId:guid}/items",
                async Task<IResult> (
                    Guid tripId,
                    CreateItemInTripRequest request,
                    IUserContextAccessor userContextAccessor,
                    CreateItemInTripHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(CreateItemInTripEndpoint));
                    logger.CreateItemInTripRequestReceived(userId.Value, tripId);

                    var result = await handler.HandleAsync(
                        new CreateItemInTripCommand(
                            userId,
                            TripId.FromGuid(tripId),
                            new NewItemDto(request.Name, request.DefaultItemId)),
                        cancellationToken);

                    var item = result.Item;
                    return Results.Created($"/items/{item.Id}", new ItemResponse(
                        item.Id,
                        item.TripId,
                        item.BaggageId,
                        item.Name,
                        item.CheckCount,
                        item.DefaultItemId));
                })
            .WithName(ItemEndpointNames.CreateItemInTrip)
            .WithTags("Items");

        return endpoints;
    }
}
