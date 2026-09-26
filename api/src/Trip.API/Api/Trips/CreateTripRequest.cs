namespace Trip.API.Api.Trips;

public sealed record CreateTripRequest(string Destination, DateOnly? StartDate, DateOnly? EndDate);
