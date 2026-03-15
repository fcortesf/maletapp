using System.Diagnostics.CodeAnalysis;
using Trip.API.Domain.ValueObjects;
using Trip.API.SeedWork;

namespace Trip.API.Domain.Entities;

public sealed class Item : IEntity
{
    private Item() { }

    [SetsRequiredMembers]
    public Item(ItemId id, TripId tripId, BaggageId baggageId, string name, Guid? defaultItemId = null)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        TripId = tripId ?? throw new ArgumentNullException(nameof(tripId));
        BaggageId = baggageId ?? throw new ArgumentNullException(nameof(baggageId));
        Name = !string.IsNullOrWhiteSpace(name)
            ? name.Trim()
            : throw new ArgumentException("Item name cannot be null or empty.", nameof(name));

        DefaultItemId = defaultItemId;
        CheckCount = 0;
    }

    public required ItemId Id { get; init; }
    public required TripId TripId { get; init; }
    public required BaggageId BaggageId { get; init; }
    public string Name { get; private set; } = string.Empty;
    public Guid? DefaultItemId { get; private set; }
    public int CheckCount { get; private set; }

    public static Item Rehydrate(ItemId id, TripId tripId, BaggageId baggageId, string name, int checkCount, Guid? defaultItemId = null)
    {
        if (checkCount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(checkCount), "Item check count cannot be negative.");
        }

        var item = new Item(id, tripId, baggageId, name, defaultItemId)
        {
            CheckCount = checkCount
        };

        return item;
    }

    public void Check()
    {
        CheckCount++;
    }

    public void Rename(string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Item name cannot be empty.", nameof(newName));

        Name = newName.Trim();
    }

    public void UpdateDefaultItemId(Guid? defaultItemId)
    {
        DefaultItemId = defaultItemId;
    }
}
