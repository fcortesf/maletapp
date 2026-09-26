namespace Trip.API.Application.Exceptions;

public sealed class NotFoundException : TripApiException
{
    public NotFoundException(string message)
        : base(message)
    {
    }
}
