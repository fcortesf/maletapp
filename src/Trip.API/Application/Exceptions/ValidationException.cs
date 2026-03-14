namespace Trip.API.Application.Exceptions;

public sealed class ValidationException : TripApiException
{
    public ValidationException(string message)
        : base(message)
    {
    }
}
