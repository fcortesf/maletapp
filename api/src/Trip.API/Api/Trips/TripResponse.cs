namespace Trip.API.Api.Trips;

public sealed record TripResponse(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
