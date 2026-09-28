using Trip.API.Domain.Entities;
using Trip.API.Domain.ValueObjects;
using Trip.API.UnitTests.Testing;

namespace Trip.API.UnitTests.Domain;

public sealed class WebDomainTests
{
    [Theory]
    [InlineData("documents")]
    [InlineData("clothing")]
    [InlineData("toiletries")]
    [InlineData("electronics")]
    [InlineData("health")]
    [InlineData("accessories")]
    [InlineData("other")]
    public void Category_IsTypedAndRehydrated(string value)
    {
        var trip = TripFixtures.CreateTrip();
        var item = trip.AddItemToDefaultBaggage("Phone");
        Assert.Equal("other", item.Category.Value);
        item.SetCategory(ItemCategory.Parse(value));
        var restored = Item.Rehydrate(item.Id, item.TripId, item.BaggageId, item.Name, category: item.Category);
        Assert.Equal(value, restored.Category.Value);
        Assert.Equal("other", Item.Rehydrate(item.Id, item.TripId, item.BaggageId, item.Name).Category.Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Clothing")]
    [InlineData("0")]
    [InlineData("unknown")]
    public void Category_RejectsInvalidCodes(string? value) => Assert.Throws<ArgumentException>(() => ItemCategory.Parse(value));

    [Fact]
    public void Lifecycle_IsExplicitAndDoesNotChangeItemsOrDates()
    {
        var trip = TripFixtures.CreateTrip();
        Assert.False(trip.IsFinished);
        trip.SetFinishedState(true);
        trip.SetFinishedState(true);
        var item = trip.AddItemToDefaultBaggage("Phone", notes: "Keep", itemCount: 2);
        item.SetPackedState(true);
        trip.SetFinishedState(false);
        Assert.False(trip.IsFinished);
        Assert.True(item.IsPacked);
        Assert.Equal("Keep", item.Notes);
        trip.SetFinishedState(true);
        Assert.True(Trip.API.Domain.Entities.Trip.Rehydrate(trip.Id, trip.OwnerId, trip.Destination, trip.StartDate, trip.EndDate, trip.Baggages, trip.IsFinished).IsFinished);
    }
}
