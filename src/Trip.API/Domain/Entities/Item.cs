using Trip.API.Domain.ValueObjects;
namespace Trip.API.Domain.Trips;

public sealed class Item
{
    private Item() { }

    public Item(ItemId id, BaggageId baggageId, string name, Guid? defaultItemId = null)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        BaggageId = baggageId ?? throw new ArgumentNullException(nameof(baggageId));
        Name = !string.IsNullOrWhiteSpace(name) 
            ? name 
            : throw new ArgumentException("Item name cannot be null or empty.", nameof(name));
        
        DefaultItemId = defaultItemId;
        CheckCount = 0;
    }

    public ItemId Id { get; private set; }
    public BaggageId BaggageId { get; private set; }
    public string Name { get; private set; }
    public Guid? DefaultItemId { get; private set; }
    public int CheckCount { get; private set; }

    public void Check()
    {
        CheckCount++;
    }

    public void Rename(string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Item name cannot be empty.", nameof(newName));

        Name = newName;
    }

    public void UpdateDefaultItemId(Guid? defaultItemId)
    {
        DefaultItemId = defaultItemId;
    }
}