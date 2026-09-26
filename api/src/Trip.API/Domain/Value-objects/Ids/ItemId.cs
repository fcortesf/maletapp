namespace Trip.API.Domain.ValueObjects;

public sealed record ItemId(Guid Value)
{
    public static ItemId CreateUnique() => new(Guid.NewGuid());
    public static ItemId FromGuid(Guid value) => new(value);
}
