namespace Trip.API.Infrastructure.Persistence;

public sealed class BaggageDataModel
{
    public Guid Id { get; set; }

    public Guid TripId { get; set; }

    public string Name { get; set; } = string.Empty;

    public bool IsDefaultBaggage { get; set; }

    public TripDataModel? Trip { get; set; }

    public List<ItemDataModel> Items { get; set; } = new();
}
