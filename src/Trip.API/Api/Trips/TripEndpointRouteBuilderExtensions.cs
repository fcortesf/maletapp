namespace Trip.API.Api.Trips;

public static class TripEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapTripEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapCreateTrip();
        endpoints.MapGetTrips();
        endpoints.MapGetTripById();

        return endpoints;
    }
}
