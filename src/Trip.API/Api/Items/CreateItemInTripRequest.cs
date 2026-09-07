namespace Trip.API.Api.Items;

public sealed record CreateItemInTripRequest(
    string Name,
    Guid? DefaultItemId,
    string? Notes = null,
    [property: System.Text.Json.Serialization.JsonNumberHandling(System.Text.Json.Serialization.JsonNumberHandling.Strict)]
    int? ItemCount = null);
