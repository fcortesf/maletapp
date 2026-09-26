namespace Trip.API.Application.Dtos;

public sealed record NewTripDto(string Destination, DateOnly? StartDate, DateOnly? EndDate);
