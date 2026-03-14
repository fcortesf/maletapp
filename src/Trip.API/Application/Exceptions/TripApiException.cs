namespace Trip.API.Application.Exceptions;

public abstract class TripApiException : Exception
{
    protected TripApiException(string message)
        : base(message)
    {
    }
}
