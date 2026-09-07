namespace Trip.API.Application.Dtos;

public sealed record PatchItemDto(
    string? Name,
    bool HasName,
    Guid? DefaultItemId,
    bool HasDefaultItemId,
    bool IsPacked,
    bool HasIsPacked,
    string? Notes = null,
    bool HasNotes = false,
    int? ItemCount = null,
    bool HasItemCount = false);
