using Trip.API.Domain.ValueObjects;
namespace Trip.API.Domain.Trips;
    
public sealed class Trip
{
    private readonly List<Baggage> _baggages = new();

    private Trip() { }

    public Trip(TripId id, UserId ownerId, string? destination, DateOnly? startDate, DateOnly? endDate)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        OwnerId = ownerId ?? throw new ArgumentNullException(nameof(ownerId));
        
        Destination = destination;
        StartDate = startDate;
        EndDate = endDate;

        ValidateDates();
    }

    public TripId Id { get; private set; }
    public UserId OwnerId { get; private set; }
    public string? Destination { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }

    public IReadOnlyCollection<Baggage> Baggages => _baggages.AsReadOnly();

    public Baggage AddBaggage(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Baggage name cannot be empty.", nameof(name));

        var baggage = new Baggage(
            BaggageId.CreateUnique(),
            this.Id,
            name
        );

        _baggages.Add(baggage);
        return baggage;
    }

    public Item AddItemToBaggage(BaggageId baggageId, string itemName, Guid? defaultItemId = null)
    {
        var baggage = _baggages.FirstOrDefault(b => b.Id == baggageId);
        if (baggage == null)
            throw new InvalidOperationException($"Baggage with id {baggageId} does not exist in this trip.");

        return baggage.AddItem(itemName, defaultItemId);
    }

    public Item AddItemToDefaultBaggage(string itemName, Guid? defaultItemId = null)
    {
        var defaultBaggage = _baggages
            .FirstOrDefault(b => b.IsDefaultBaggage);

        if (defaultBaggage == null)
        {
            defaultBaggage = new Baggage(
                BaggageId.CreateUnique(),
                this.Id,
                "Default Baggage",
                isDefaultBaggage: true
            );
            _baggages.Add(defaultBaggage);
        }

        return defaultBaggage.AddItem(itemName, defaultItemId);
    }

    private void ValidateDates()
    {
        if (StartDate.HasValue && EndDate.HasValue && StartDate > EndDate)
        {
            throw new InvalidOperationException(
                $"Trip start date {StartDate} cannot be after end date {EndDate}."
            );
        }
    }
}
