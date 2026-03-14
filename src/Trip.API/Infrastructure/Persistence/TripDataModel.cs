namespace Trip.API.Infrastructure.Persistence;

public sealed class TripDataModel
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public string Destination { get; set; } = string.Empty;

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }
}
