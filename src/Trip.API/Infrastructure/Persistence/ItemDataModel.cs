namespace Trip.API.Infrastructure.Persistence;

public sealed class ItemDataModel
{
    public Guid Id { get; set; }

    public Guid TripId { get; set; }

    public Guid BaggageId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int CheckCount { get; set; }

    public Guid? DefaultItemId { get; set; }

    public BaggageDataModel? Baggage { get; set; }
}
