namespace Trip.API.Application.Exceptions;

public sealed class ForbiddenException : TripApiException
{
    public ForbiddenException(string message)
        : base(message)
    {
    }
}
