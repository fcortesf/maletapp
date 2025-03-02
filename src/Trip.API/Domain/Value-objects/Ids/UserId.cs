namespace Trip.API.Domain.ValueObjects;

public sealed record UserId(Guid Value)
{
    public static UserId CreateUnique() => new(Guid.NewGuid());
    public static UserId FromGuid(Guid value) => new(value);
}
