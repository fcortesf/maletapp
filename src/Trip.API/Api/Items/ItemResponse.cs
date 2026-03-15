namespace Trip.API.Api.Items;

public sealed record ItemResponse(
    Guid Id,
    Guid TripId,
    Guid BaggageId,
    string Name,
    int CheckCount,
    Guid? DefaultItemId);
