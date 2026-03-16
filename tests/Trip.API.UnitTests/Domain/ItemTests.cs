using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;

namespace Trip.API.UnitTests.Domain;

public sealed class ItemTests
{
    [Fact]
    public void AddItemToDefaultBaggage_CreatesDefaultBaggage_WhenMissing()
    {
        var trip = TripFixtures.CreateTrip();

        var item = trip.AddItemToDefaultBaggage("Passport");

        var defaultBaggage = Assert.Single(trip.Baggages);
        Assert.True(defaultBaggage.IsDefaultBaggage);
        Assert.Equal(defaultBaggage.Id, item.BaggageId);
        Assert.Equal(trip.Id, item.TripId);
        Assert.Equal(0, item.CheckCount);
    }

    [Fact]
    public void Rename_ThrowsArgumentException_WhenNameIsBlank()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");

        Assert.Throws<ArgumentException>(() => item.Rename(" "));
    }

    [Fact]
    public void UpdateDefaultItemId_UpdatesReference()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        var defaultItemId = Guid.NewGuid();

        item.UpdateDefaultItemId(defaultItemId);

        Assert.Equal(defaultItemId, item.DefaultItemId);
    }

    [Fact]
    public void FindItem_ReturnsItem_WhenPresentInTrip()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");

        var found = trip.FindItem(item.Id);

        Assert.NotNull(found);
        Assert.Equal(item.Id, found!.Id);
    }

    [Fact]
    public void Rehydrate_CreatesItemWithExistingCheckCount()
    {
        var item = Trip.API.Domain.Entities.Item.Rehydrate(
            ItemId.CreateUnique(),
            TripId.CreateUnique(),
            BaggageId.CreateUnique(),
            "Passport",
            2,
            Guid.NewGuid());

        Assert.Equal(2, item.CheckCount);
    }

    [Fact]
    public void Check_IncrementsCheckCountByOne()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");

        item.Check();

        Assert.Equal(1, item.CheckCount);
    }

    [Fact]
    public void Check_CanBeCalledMultipleTimes()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");

        item.Check();
        item.Check();

        Assert.Equal(2, item.CheckCount);
    }

    [Fact]
    public void Check_DoesNotChangeIdentityOrMetadata()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport", Guid.NewGuid());
        var originalId = item.Id;
        var originalTripId = item.TripId;
        var originalBaggageId = item.BaggageId;
        var originalName = item.Name;
        var originalDefaultItemId = item.DefaultItemId;

        item.Check();

        Assert.Equal(originalId, item.Id);
        Assert.Equal(originalTripId, item.TripId);
        Assert.Equal(originalBaggageId, item.BaggageId);
        Assert.Equal(originalName, item.Name);
        Assert.Equal(originalDefaultItemId, item.DefaultItemId);
    }
}
