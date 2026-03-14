namespace Trip.API.Application.Exceptions;

public sealed class UnauthorizedException : TripApiException
{
    public UnauthorizedException(string message)
        : base(message)
    {
    }
}
