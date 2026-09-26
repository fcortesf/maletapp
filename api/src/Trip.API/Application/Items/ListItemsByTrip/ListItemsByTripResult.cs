using Trip.API.Application.Dtos;

namespace Trip.API.Application.Items.ListItemsByTrip;

public sealed record ListItemsByTripResult(IReadOnlyList<ItemDto> Items);
