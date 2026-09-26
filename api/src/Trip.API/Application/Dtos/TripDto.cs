namespace Trip.API.Application.Dtos;

public sealed record TripDto(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
