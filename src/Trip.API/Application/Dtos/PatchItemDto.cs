namespace Trip.API.Application.Dtos;

public sealed record PatchItemDto(string? Name, bool HasName, Guid? DefaultItemId, bool HasDefaultItemId);
