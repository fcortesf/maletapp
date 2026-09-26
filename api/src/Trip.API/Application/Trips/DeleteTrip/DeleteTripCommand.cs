using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Trips.DeleteTrip;

public sealed record DeleteTripCommand(UserId UserId, TripId TripId);
