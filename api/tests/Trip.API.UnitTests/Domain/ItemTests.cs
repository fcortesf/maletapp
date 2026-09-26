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
        Assert.False(item.IsPacked);
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
    public void Rehydrate_CreatesItemWithExistingPackedState()
    {
        var item = Trip.API.Domain.Entities.Item.Rehydrate(
            ItemId.CreateUnique(),
            TripId.CreateUnique(),
            BaggageId.CreateUnique(),
            "Passport",
            Guid.NewGuid(),
            isPacked: true);

        Assert.True(item.IsPacked);
    }

    [Fact]
    public void SetPackedState_MarksItemAsPacked()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");

        item.SetPackedState(true);

        Assert.True(item.IsPacked);
    }

    [Fact]
    public void SetPackedState_MarksItemAsUnpacked()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Passport");
        item.SetPackedState(true);

        item.SetPackedState(false);

        Assert.False(item.IsPacked);
    }



    [Fact]
    public void Details_DefaultToNull_AndCanBeChangedOrCleared()
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Socks");
        Assert.Null(item.Notes);
        Assert.Null(item.ItemCount);
        item.UpdateNotes("Bring spares");
        item.SetItemCount(3);
        item.SetPackedState(true);
        Assert.Equal("Bring spares", item.Notes);
        Assert.Equal(3, item.ItemCount);
        item.UpdateNotes(null);
        item.SetItemCount(null);
        Assert.Null(item.Notes);
        Assert.Null(item.ItemCount);
        Assert.True(item.IsPacked);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Quantity_RejectsNonpositiveValues(int count)
    {
        var trip = TripFixtures.CreateTrip();
        Assert.Throws<ArgumentOutOfRangeException>(() => trip.AddItemToDefaultBaggage("Socks", itemCount: count));
        var item = trip.AddItemToDefaultBaggage("Socks", notes: "Keep", itemCount: 2);
        Assert.Throws<ArgumentOutOfRangeException>(() => item.SetItemCount(count));
        Assert.Equal(2, item.ItemCount);
    }
}
