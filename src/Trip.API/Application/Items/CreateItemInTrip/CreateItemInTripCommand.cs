using Trip.API.Application.Dtos;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Items.CreateItemInTrip;

public sealed record CreateItemInTripCommand(UserId UserId, TripId TripId, NewItemDto Item);
