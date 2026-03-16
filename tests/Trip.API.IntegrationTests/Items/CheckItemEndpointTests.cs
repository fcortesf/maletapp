using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class CheckItemEndpointTests
{
    [Fact]
    public async Task CheckItem_ReturnsUpdatedItem_WhenOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Lisbon");
        var item = await CreateItemAsync(client, trip.Id, "Passport");

        var response = await client.PostAsync($"/items/{item.Id}/check-item", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var checkedItem = await response.Content.ReadFromJsonAsync<ItemResponseContract>();
        Assert.NotNull(checkedItem);
        Assert.Equal(item.Id, checkedItem!.Id);
        Assert.Equal("Passport", checkedItem.Name);
        Assert.Equal(1, checkedItem.CheckCount);
    }

    [Fact]
    public async Task CheckItem_ReturnsUnauthorized_WhenUserHeaderIsMissing()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();

        var response = await client.PostAsync($"/items/{Guid.NewGuid()}/check-item", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CheckItem_ReturnsForbidden_WhenItemBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Berlin");
        var item = await CreateItemAsync(ownerClient, trip.Id, "Passport");

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.PostAsync($"/items/{item.Id}/check-item", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CheckItem_ReturnsNotFound_WhenItemDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.PostAsync($"/items/{Guid.NewGuid()}/check-item", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CheckItem_CanBeCalledMultipleTimes_AndRetrievalsShowLatestCount()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Porto");
        var item = await CreateItemAsync(client, trip.Id, "Passport");

        await client.PostAsync($"/items/{item.Id}/check-item", null);
        var secondCheckResponse = await client.PostAsync($"/items/{item.Id}/check-item", null);
        var getItemResponse = await client.GetAsync($"/items/{item.Id}");
        var listItemsResponse = await client.GetAsync($"/trips/{trip.Id}/items");

        Assert.Equal(HttpStatusCode.OK, secondCheckResponse.StatusCode);
        var checkedItem = await secondCheckResponse.Content.ReadFromJsonAsync<ItemResponseContract>();
        Assert.NotNull(checkedItem);
        Assert.Equal(2, checkedItem!.CheckCount);

        var retrievedItem = await getItemResponse.Content.ReadFromJsonAsync<ItemResponseContract>();
        Assert.NotNull(retrievedItem);
        Assert.Equal(2, retrievedItem!.CheckCount);

        var listedItems = await listItemsResponse.Content.ReadFromJsonAsync<ItemResponseContract[]>();
        Assert.NotNull(listedItems);
        Assert.Single(listedItems!);
        Assert.Equal(2, listedItems[0].CheckCount);
    }

    [Fact]
    public async Task CheckItem_PreservesItemFields_BesidesCheckCount()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Rome");
        var item = await CreateItemAsync(client, trip.Id, "Passport");

        var response = await client.PostAsync($"/items/{item.Id}/check-item", null);

        var checkedItem = await response.Content.ReadFromJsonAsync<ItemResponseContract>();
        Assert.NotNull(checkedItem);
        Assert.Equal(item.Id, checkedItem!.Id);
        Assert.Equal(item.TripId, checkedItem.TripId);
        Assert.Equal(item.BaggageId, checkedItem.BaggageId);
        Assert.Equal(item.Name, checkedItem.Name);
        Assert.Equal(item.DefaultItemId, checkedItem.DefaultItemId);
    }

    private static async Task<TripResponseContract> CreateTripAsync(HttpClient client, string destination)
    {
        var response = await client.PostAsJsonAsync("/trips", new { destination });
        return (await response.Content.ReadFromJsonAsync<TripResponseContract>())!;
    }

    private static async Task<ItemResponseContract> CreateItemAsync(HttpClient client, Guid tripId, string name)
    {
        var response = await client.PostAsJsonAsync($"/trips/{tripId}/items", new { name });
        return (await response.Content.ReadFromJsonAsync<ItemResponseContract>())!;
    }

    private sealed record TripResponseContract(Guid Id, string Destination, DateOnly? StartDate, DateOnly? EndDate);
    private sealed record ItemResponseContract(Guid Id, Guid TripId, Guid BaggageId, string Name, int CheckCount, Guid? DefaultItemId);
}
