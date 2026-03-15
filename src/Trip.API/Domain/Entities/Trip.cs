using System.Diagnostics.CodeAnalysis;
using Trip.API.Domain.ValueObjects;
using Trip.API.SeedWork;

namespace Trip.API.Domain.Entities;

public sealed class Trip : IEntity
{
    private readonly List<Baggage> _baggages = new();

    private Trip()
    {
    }

    [SetsRequiredMembers]
    public Trip(TripId id, UserId ownerId, string destination, DateOnly? startDate, DateOnly? endDate)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
        OwnerId = ownerId ?? throw new ArgumentNullException(nameof(ownerId));

        Destination = !string.IsNullOrWhiteSpace(destination)
            ? destination.Trim()
            : throw new ArgumentException("Trip destination cannot be null or empty.", nameof(destination));
        StartDate = startDate;
        EndDate = endDate;

        ValidateDates();
    }

    public required TripId Id { get; init; }
    public required UserId OwnerId { get; init; }
    public string Destination { get; private set; } = string.Empty;
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }

    public IReadOnlyCollection<Baggage> Baggages => _baggages.AsReadOnly();

    public IReadOnlyCollection<Item> Items => _baggages
        .SelectMany(baggage => baggage.Items)
        .ToArray();

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

    public Item? FindItem(ItemId itemId)
    {
        return _baggages
            .SelectMany(baggage => baggage.Items)
            .SingleOrDefault(item => item.Id == itemId);
    }

    public static Trip Rehydrate(
        TripId id,
        UserId ownerId,
        string destination,
        DateOnly? startDate,
        DateOnly? endDate,
        IEnumerable<Baggage>? baggages = null)
    {
        var trip = new Trip(id, ownerId, destination, startDate, endDate);

        if (baggages is not null)
        {
            trip._baggages.AddRange(baggages);
        }

        return trip;
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
