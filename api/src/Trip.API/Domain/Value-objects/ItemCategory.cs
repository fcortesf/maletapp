namespace Trip.API.Domain.ValueObjects;

public sealed record ItemCategory
{
    private ItemCategory(string value) => Value = value;
    public string Value { get; }
    public static ItemCategory Other { get; } = new("other");

    public static ItemCategory Parse(string? value) => value switch
    {
        "documents" or "clothing" or "toiletries" or "electronics" or "health" or "accessories" or "other" => new(value),
        _ => throw new ArgumentException("Category must be a supported lowercase code.", nameof(value))
    };
}
