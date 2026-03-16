using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Items.CheckItem;

public sealed record CheckItemCommand(UserId UserId, ItemId ItemId);
