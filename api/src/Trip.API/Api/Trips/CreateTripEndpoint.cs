using Trip.API.Application.Abstractions;
using Trip.API.Application.Dtos;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.CreateTrip;

namespace Trip.API.Api.Trips;

public static class CreateTripEndpoint
{
    public static IEndpointRouteBuilder MapCreateTrip(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost(
                "/trips",
                async Task<IResult> (
                    CreateTripRequest request,
                    IUserContextAccessor userContextAccessor,
                    CreateTripHandler handler,
                    ILoggerFactory loggerFactory,
                    CancellationToken cancellationToken) =>
                {
                    var userId = userContextAccessor.GetCurrentUserId()
                        ?? throw new UnauthorizedException("Current user could not be determined.");

                    var logger = loggerFactory.CreateLogger(nameof(CreateTripEndpoint));
                    logger.CreateTripRequestReceived(userId.Value);

                    var result = await handler.HandleAsync(
                        new CreateTripCommand(
                            userId,
                            new NewTripDto(request.Destination, request.StartDate, request.EndDate)),
                        cancellationToken);

                    var trip = result.Trip;
                    return Results.Created($"/trips/{trip.Id}", new TripResponse(trip.Id, trip.Destination, trip.StartDate, trip.EndDate));
                })
            .WithName(TripEndpointNames.CreateTrip)
            .WithTags("Trips");

        return endpoints;
    }
}
