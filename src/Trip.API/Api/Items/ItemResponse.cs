namespace Trip.API.Api.Items;

public sealed record ItemResponse(
    Guid Id,
    Guid TripId,
    Guid BaggageId,
    string Name,
    bool IsPacked,
    Guid? DefaultItemId,
    string? Notes,
    int? ItemCount);
