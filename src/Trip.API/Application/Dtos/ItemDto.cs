namespace Trip.API.Application.Dtos;

public sealed record ItemDto(
    Guid Id,
    Guid TripId,
    Guid BaggageId,
    string Name,
    int CheckCount,
    Guid? DefaultItemId);
