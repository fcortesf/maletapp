using Trip.API.Application.Dtos;
using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Testing;

public static class TripFixtures
{
    public static UserId CreateUserId()
    {
        return UserId.CreateUnique();
    }

    public static NewTripDto CreateNewTripDto(
        string destination = "Madrid",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        return new NewTripDto(destination, startDate, endDate);
    }

    public static TripEntity CreateTrip(
        UserId? ownerId = null,
        string destination = "Madrid",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        return new TripEntity(
            TripId.CreateUnique(),
            ownerId ?? CreateUserId(),
            destination,
            startDate,
            endDate);
    }
}
