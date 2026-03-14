using Trip.API.Application.Dtos;

namespace Trip.API.Application.Trips.GetTrips;

public sealed record GetTripsResult(IReadOnlyList<TripDto> Trips);
