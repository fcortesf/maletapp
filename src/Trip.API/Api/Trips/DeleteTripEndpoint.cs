using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.DeleteTrip;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Trips;

public static class DeleteTripEndpoint
{
    public static IEndpointRouteBuilder MapDeleteTrip(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapDelete(
                "/trips/{tripId:guid}",
                async Task<IResult> (
                    Guid tripId,
                    IUserContextAccessor userContextAccessor,
                    DeleteTripHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(DeleteTripEndpoint));
                    logger.DeleteTripRequestReceived(userId.Value, tripId);

                    await handler.HandleAsync(
                        new DeleteTripCommand(userId, TripId.FromGuid(tripId)),
                        cancellationToken);

                    return Results.NoContent();
                })
            .WithName(TripEndpointNames.DeleteTrip)
            .WithTags("Trips");

        return endpoints;
    }
}
