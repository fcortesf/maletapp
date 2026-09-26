namespace Trip.API.Application.Dtos;

public sealed record NewItemDto(string Name, Guid? DefaultItemId, string? Notes = null, int? ItemCount = null);
