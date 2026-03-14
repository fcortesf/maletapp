using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using TripEntity = Trip.API.Domain.Entities.Trip;

namespace Trip.API.UnitTests.Domain;

public sealed class TripTests
{
    [Fact]
    public void Constructor_CreatesTrip_WhenDestinationAndDatesAreValid()
    {
        var trip = new TripEntity(
            TripId.CreateUnique(),
            UserId.CreateUnique(),
            "Lisbon",
            new DateOnly(2026, 4, 1),
            new DateOnly(2026, 4, 10));

        Assert.Equal("Lisbon", trip.Destination);
        Assert.Equal(new DateOnly(2026, 4, 1), trip.StartDate);
        Assert.Equal(new DateOnly(2026, 4, 10), trip.EndDate);
    }

    [Fact]
    public void Constructor_ThrowsArgumentException_WhenDestinationIsMissing()
    {
        var action = () => new TripEntity(
            TripId.CreateUnique(),
            UserId.CreateUnique(),
            " ",
            null,
            null);

        Assert.Throws<ArgumentException>(action);
    }

    [Fact]
    public void Constructor_ThrowsInvalidOperationException_WhenStartDateIsAfterEndDate()
    {
        var action = () => new TripEntity(
            TripId.CreateUnique(),
            UserId.CreateUnique(),
            "Tokyo",
            new DateOnly(2026, 5, 10),
            new DateOnly(2026, 5, 1));

        Assert.Throws<InvalidOperationException>(action);
    }
}
