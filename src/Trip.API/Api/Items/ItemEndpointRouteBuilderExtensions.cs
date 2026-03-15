namespace Trip.API.Api.Items;

public static class ItemEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapItemEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapListItemsByTrip();
        endpoints.MapCreateItemInTrip();
        endpoints.MapGetItem();
        endpoints.MapPatchItem();

        return endpoints;
    }
}
