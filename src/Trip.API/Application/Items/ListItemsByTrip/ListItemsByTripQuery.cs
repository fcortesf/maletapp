using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Items.ListItemsByTrip;

public sealed record ListItemsByTripQuery(UserId UserId, TripId TripId);
