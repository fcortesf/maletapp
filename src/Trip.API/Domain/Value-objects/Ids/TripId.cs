namespace Trip.API.Domain.ValueObjects;
public sealed record TripId(Guid Value)
{
    public static TripId CreateUnique() => new(Guid.NewGuid());
    public static TripId FromGuid(Guid value) => new(value);
}
