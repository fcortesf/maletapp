using System.Diagnostics.CodeAnalysis;
using Trip.API.Domain.ValueObjects;
using Trip.API.SeedWork;

namespace Trip.API.Domain.Entities;

public sealed class Item : IEntity
{
    private Item() { }

    [SetsRequiredMembers]
    public Item(ItemId id, TripId tripId, BaggageId baggageId, string name, Guid? defaultItemId = null, string? notes = null, int? itemCount = null)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        TripId = tripId ?? throw new ArgumentNullException(nameof(tripId));
        BaggageId = baggageId ?? throw new ArgumentNullException(nameof(baggageId));
        Name = !string.IsNullOrWhiteSpace(name)
            ? name.Trim()
            : throw new ArgumentException("Item name cannot be null or empty.", nameof(name));

        DefaultItemId = defaultItemId;
        Notes = notes;
        SetItemCount(itemCount);
        IsPacked = false;
    }

    public required ItemId Id { get; init; }
    public required TripId TripId { get; init; }
    public required BaggageId BaggageId { get; init; }
    public string Name { get; private set; } = string.Empty;
    public Guid? DefaultItemId { get; private set; }
    public string? Notes { get; private set; }
    public int? ItemCount { get; private set; }
    public bool IsPacked { get; private set; }

    public static Item Rehydrate(
        ItemId id,
        TripId tripId,
        BaggageId baggageId,
        string name,
        Guid? defaultItemId = null,
        bool isPacked = false,
        string? notes = null,
        int? itemCount = null)
    {
        var item = new Item(id, tripId, baggageId, name, defaultItemId, notes, itemCount)
        {
            IsPacked = isPacked
        };

        return item;
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

    public void UpdateNotes(string? notes) => Notes = notes;

    public void SetItemCount(int? itemCount)
    {
        if (itemCount is <= 0)
            throw new ArgumentOutOfRangeException(nameof(itemCount), "Item count must be positive.");
        ItemCount = itemCount;
    }

    public void SetPackedState(bool isPacked)
    {
        IsPacked = isPacked;
    }
}
