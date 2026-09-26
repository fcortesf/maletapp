using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Items.GetItem;

public sealed record GetItemQuery(UserId UserId, ItemId ItemId);
