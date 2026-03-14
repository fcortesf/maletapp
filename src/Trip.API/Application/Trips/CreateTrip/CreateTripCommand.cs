using Trip.API.Application.Dtos;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Trips.CreateTrip;

public sealed record CreateTripCommand(UserId UserId, NewTripDto NewTrip);
