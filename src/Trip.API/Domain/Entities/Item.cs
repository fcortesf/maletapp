using System.Diagnostics.CodeAnalysis;
using Trip.API.Domain.ValueObjects;
using Trip.API.SeedWork;
namespace Trip.API.Domain.Trips;

public sealed class Item : IEntity
{
    private Item() { }

    [SetsRequiredMembers]
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

    public required ItemId Id { get; init; }
    public required BaggageId BaggageId { get; init; }
    public required string Name { get; set; }
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