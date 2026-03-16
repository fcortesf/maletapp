namespace Trip.API.Api.Trips;

internal static partial class TripLogMessages
{
    [LoggerMessage(EventId = 1000, Level = LogLevel.Information, Message = "Received create trip request for user {UserId}")]
    public static partial void CreateTripRequestReceived(this ILogger logger, Guid userId);

    [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Received get trips request for user {UserId}")]
    public static partial void GetTripsRequestReceived(this ILogger logger, Guid userId);

    [LoggerMessage(EventId = 1002, Level = LogLevel.Information, Message = "Received get trip detail request for user {UserId} and trip {TripId}")]
    public static partial void GetTripByIdRequestReceived(this ILogger logger, Guid userId, Guid tripId);

    [LoggerMessage(EventId = 1003, Level = LogLevel.Information, Message = "Received delete trip request for user {UserId} and trip {TripId}")]
    public static partial void DeleteTripRequestReceived(this ILogger logger, Guid userId, Guid tripId);
}
