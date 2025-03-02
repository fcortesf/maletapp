using Trip.API.Domain.ValueObjects;
using Trip.API.SeedWork;
namespace Trip.API.Domain.Trips;

public sealed class Baggage : IEntity
{
    private readonly List<Item> _items = new();

    private Baggage() { }

    public Baggage(BaggageId id, TripId tripId, string name, bool isDefaultBaggage = false)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        TripId = tripId ?? throw new ArgumentNullException(nameof(tripId));
        Name = !string.IsNullOrWhiteSpace(name) 
            ? name 
            : throw new ArgumentException("Baggage name cannot be null or empty.", nameof(name));

        IsDefaultBaggage = isDefaultBaggage;
    }

    public BaggageId Id { get; private set; }
    public TripId TripId { get; private set; }
    public string Name { get; private set; }
    public bool IsDefaultBaggage { get; private set; }

    public IReadOnlyCollection<Item> Items => _items.AsReadOnly();

    public Item AddItem(string itemName, Guid? defaultItemId)
    {
        if (string.IsNullOrWhiteSpace(itemName))
            throw new ArgumentException("Item name cannot be empty.", nameof(itemName));

        var item = new Item(ItemId.CreateUnique(), this.Id, itemName, defaultItemId);

        _items.Add(item);
        return item;
    }
}
