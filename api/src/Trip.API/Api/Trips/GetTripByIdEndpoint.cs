using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.GetTripById;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Trips;

public static class GetTripByIdEndpoint
{
    public static IEndpointRouteBuilder MapGetTripById(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
                "/trips/{tripId:guid}",
                async Task<IResult> (
                    Guid tripId,
                    IUserContextAccessor userContextAccessor,
                    GetTripByIdHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(GetTripByIdEndpoint));
                    logger.GetTripByIdRequestReceived(userId.Value, tripId);

                    var result = await handler.HandleAsync(
                        new GetTripByIdQuery(userId, TripId.FromGuid(tripId)),
                        cancellationToken);

                    var trip = result.Trip;
                    return Results.Ok(new TripResponse(trip.Id, trip.Destination, trip.StartDate, trip.EndDate));
                })
            .WithName(TripEndpointNames.GetTripById)
            .WithTags("Trips");

        return endpoints;
    }
}
