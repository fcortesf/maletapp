using System.Net;
using System.Net.Http.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class PatchItemEndpointTests
{
    [Fact]
    public async Task PatchItem_ReturnsUpdatedItem_WhenOwnedByCurrentUser()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Helsinki");
        var item = await CreateItemAsync(client, trip.Id, "Passport");

        var response = await client.PatchAsJsonAsync($"/items/{item.Id}", new { name = "Updated Passport", defaultItemId = Guid.NewGuid() });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ItemResponseContract>();
        Assert.Equal("Updated Passport", updated!.Name);
    }

    [Fact]
    public async Task PatchItem_ReturnsNotFound_WhenItemDoesNotExist()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await client.PatchAsJsonAsync($"/items/{Guid.NewGuid()}", new { name = "Updated Passport" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PatchItem_ReturnsForbidden_WhenItemBelongsToDifferentUser()
    {
        await using var factory = new TripApiFactory();
        using var ownerClient = factory.CreateApiClient();
        ownerClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(ownerClient, "Tallinn");
        var item = await CreateItemAsync(ownerClient, trip.Id, "Passport");

        using var otherClient = factory.CreateApiClient();
        otherClient.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());

        var response = await otherClient.PatchAsJsonAsync($"/items/{item.Id}", new { name = "Updated Passport" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PatchItem_ReturnsBadRequest_WhenNameIsBlank()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await CreateTripAsync(client, "Copenhagen");
        var item = await CreateItemAsync(client, trip.Id, "Passport");

        var response = await client.PatchAsJsonAsync($"/items/{item.Id}", new { name = " " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
