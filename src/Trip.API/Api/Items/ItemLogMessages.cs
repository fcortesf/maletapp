namespace Trip.API.Api.Items;

internal static partial class ItemLogMessages
{
    [LoggerMessage(EventId = 1100, Level = LogLevel.Information, Message = "Received list items request for user {UserId} and trip {TripId}")]
    public static partial void ListItemsByTripRequestReceived(this ILogger logger, Guid userId, Guid tripId);

    [LoggerMessage(EventId = 1101, Level = LogLevel.Information, Message = "Received create item request for user {UserId} and trip {TripId}")]
    public static partial void CreateItemInTripRequestReceived(this ILogger logger, Guid userId, Guid tripId);

    [LoggerMessage(EventId = 1102, Level = LogLevel.Information, Message = "Received get item request for user {UserId} and item {ItemId}")]
    public static partial void GetItemRequestReceived(this ILogger logger, Guid userId, Guid itemId);

    [LoggerMessage(EventId = 1103, Level = LogLevel.Information, Message = "Received patch item request for user {UserId} and item {ItemId}")]
    public static partial void PatchItemRequestReceived(this ILogger logger, Guid userId, Guid itemId);
}
