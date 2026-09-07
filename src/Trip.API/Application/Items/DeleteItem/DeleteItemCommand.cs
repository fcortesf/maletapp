using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Items.DeleteItem;

public sealed record DeleteItemCommand(UserId UserId, ItemId ItemId);
