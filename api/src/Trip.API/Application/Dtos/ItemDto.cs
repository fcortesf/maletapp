namespace Trip.API.Application.Dtos;

public sealed record ItemDto(
    Guid Id,
    Guid TripId,
    Guid BaggageId,
    string Name,
    bool IsPacked,
    Guid? DefaultItemId,
    string? Notes,
    int? ItemCount);
