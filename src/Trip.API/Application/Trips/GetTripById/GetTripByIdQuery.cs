using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Trips.GetTripById;

public sealed record GetTripByIdQuery(UserId UserId, TripId TripId);
