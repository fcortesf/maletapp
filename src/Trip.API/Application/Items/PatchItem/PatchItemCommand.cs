using Trip.API.Application.Dtos;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Items.PatchItem;

public sealed record PatchItemCommand(UserId UserId, ItemId ItemId, PatchItemDto Item);
