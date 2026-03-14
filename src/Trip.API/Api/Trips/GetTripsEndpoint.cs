using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.GetTrips;

namespace Trip.API.Api.Trips;

public static class GetTripsEndpoint
{
    public static IEndpointRouteBuilder MapGetTrips(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
                "/trips",
                async Task<IResult> (
                    IUserContextAccessor userContextAccessor,
                    GetTripsHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(GetTripsEndpoint));
                    logger.GetTripsRequestReceived(userId.Value);

                    var result = await handler.HandleAsync(new GetTripsQuery(userId), cancellationToken);
                    var response = result.Trips
                        .Select(trip => new TripResponse(trip.Id, trip.Destination, trip.StartDate, trip.EndDate));

                    return Results.Ok(response);
                })
            .WithName(TripEndpointNames.GetTrips)
            .WithTags("Trips");

        return endpoints;
    }
}
