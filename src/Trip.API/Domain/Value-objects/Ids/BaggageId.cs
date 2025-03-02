namespace Trip.API.Domain.ValueObjects;

public sealed record BaggageId(Guid Value)
{
    public static BaggageId CreateUnique() => new(Guid.NewGuid());
    public static BaggageId FromGuid(Guid value) => new(value);
}
