namespace Trip.API.Api.Items;

public sealed record CreateItemInTripRequest(string Name, Guid? DefaultItemId);
