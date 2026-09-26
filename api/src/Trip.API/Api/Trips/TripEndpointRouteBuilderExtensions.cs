namespace Trip.API.Api.Trips;

public static class TripEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapTripEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapCreateTrip();
        endpoints.MapDeleteTrip();
        endpoints.MapGetTrips();
        endpoints.MapGetTripById();

        return endpoints;
    }
}
