using System.Diagnostics.CodeAnalysis;
using Trip.API.Domain.ValueObjects;
using Trip.API.SeedWork;

namespace Trip.API.Domain.Entities;

public sealed class Baggage : IEntity
{
    private readonly List<Item> _items = new();

    private Baggage() { }

    [SetsRequiredMembers]
    public Baggage(BaggageId id, TripId tripId, string name, bool isDefaultBaggage = false)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        TripId = tripId ?? throw new ArgumentNullException(nameof(tripId));
        Name = !string.IsNullOrWhiteSpace(name)
            ? name
            : throw new ArgumentException("Baggage name cannot be null or empty.", nameof(name));

        IsDefaultBaggage = isDefaultBaggage;
    }

    public required BaggageId Id { get; init; }
    public required TripId TripId { get; init; }
    public required string Name { get; init; }
    public bool IsDefaultBaggage { get; private set; }

    public IReadOnlyCollection<Item> Items => _items.AsReadOnly();

    public Item AddItem(string itemName, Guid? defaultItemId)
    {
        if (string.IsNullOrWhiteSpace(itemName))
            throw new ArgumentException("Item name cannot be empty.", nameof(itemName));

        var item = new Item(ItemId.CreateUnique(), TripId, Id, itemName, defaultItemId);

        _items.Add(item);
        return item;
    }

    public Item? FindItem(ItemId itemId)
    {
        return _items.SingleOrDefault(item => item.Id == itemId);
    }

    public static Baggage Rehydrate(BaggageId id, TripId tripId, string name, bool isDefaultBaggage, IEnumerable<Item>? items = null)
    {
        var baggage = new Baggage(id, tripId, name, isDefaultBaggage);

        if (items is not null)
        {
            baggage._items.AddRange(items);
        }

        return baggage;
    }
}
