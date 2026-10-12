using Trip.API.Application.Abstractions;
using Trip.API.Application.Exceptions;
using Trip.API.Application.Trips.SetTripFinished;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Api.Trips;

public static class TripLifecycleEndpoints
{
    public static IEndpointRouteBuilder MapTripLifecycle(this IEndpointRouteBuilder endpoints)
    {
        MapCommand(endpoints, "finish", "finishTrip", true);
        MapCommand(endpoints, "reopen", "reopenTrip", false);
        return endpoints;
    }

    private static void MapCommand(IEndpointRouteBuilder endpoints, string action, string operationName, bool isFinished)
    {
        endpoints.MapPost($"/trips/{{tripId:guid}}/{action}", async Task<IResult> (
            Guid tripId, IUserContextAccessor userContextAccessor, SetTripFinishedHandler handler, CancellationToken cancellationToken) =>
        {
            var userId = userContextAccessor.GetCurrentUserId()
                ?? throw new UnauthorizedException("Current user could not be determined.");
            var trip = await handler.HandleAsync(userId, TripId.FromGuid(tripId), isFinished, cancellationToken);
            return Results.Ok(new TripResponse(trip.Id, trip.Destination, trip.StartDate, trip.EndDate, trip.IsFinished));
        }).WithName(operationName).WithTags("Trips").Produces<TripResponse>(200)
            .ProducesProblem(401).ProducesProblem(403).ProducesProblem(404).ProducesProblem(500);
    }
}
