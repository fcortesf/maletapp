using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class CategoryEndpointTests
{
    [Theory]
    [InlineData("documents")]
    [InlineData("clothing")]
    [InlineData("toiletries")]
    [InlineData("electronics")]
    [InlineData("health")]
    [InlineData("accessories")]
    [InlineData("other")]
    public async Task Category_PersistsInEveryResponse_AndPreservesOtherFieldsAsync(string category)
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await ReadAsync(await client.PostAsJsonAsync("/trips", new { destination = "Lisbon" }));
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}/items";
        var item = await ReadAsync(await client.PostAsJsonAsync(url, new { name = "Keep", notes = "Notes", itemCount = 2, category }));
        var itemUrl = $"/items/{item.GetProperty("id").GetGuid()}";
        Assert.Equal(category, item.GetProperty("category").GetString());
        foreach (var body in new object[] { new { isPacked = true }, new { notes = "Revised" }, new { itemCount = (int?)null } })
        {
            item = await ReadAsync(await client.PatchAsJsonAsync(itemUrl, body));
            Assert.Equal(category, item.GetProperty("category").GetString());
        }
        Assert.Equal(category, (await client.GetFromJsonAsync<JsonElement>(itemUrl)).GetProperty("category").GetString());
        Assert.Equal(category, (await client.GetFromJsonAsync<JsonElement>(url))[0].GetProperty("category").GetString());
        var updated = await ReadAsync(await client.PatchAsJsonAsync(itemUrl, new { category = "other" }));
        Assert.Equal("other", updated.GetProperty("category").GetString());
        Assert.Equal("Keep", updated.GetProperty("name").GetString());
        Assert.Equal("Revised", updated.GetProperty("notes").GetString());
        Assert.Equal(JsonValueKind.Null, updated.GetProperty("itemCount").ValueKind);
        Assert.True(updated.GetProperty("isPacked").GetBoolean());
        using var foreign = factory.CreateApiClient();
        foreign.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await foreign.PatchAsJsonAsync(itemUrl, new { category })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PatchAsJsonAsync($"/items/{Guid.NewGuid()}", new { category })).StatusCode);
        var legacy = await ReadAsync(await client.PostAsJsonAsync(url, new { name = "Default" }));
        Assert.Equal("other", legacy.GetProperty("category").GetString());
        Assert.False(legacy.GetProperty("isPacked").GetBoolean());
    }

    [Theory]
    [InlineData("null")]
    [InlineData("42")]
    [InlineData("true")]
    [InlineData("[]")]
    [InlineData("\"\"")]
    [InlineData("\"Clothing\"")]
    [InlineData("\"invalid\"")]
    public async Task InvalidCategory_ReturnsProblem_WithoutPartialMutationAsync(string category)
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var trip = await ReadAsync(await client.PostAsJsonAsync("/trips", new { destination = "Lisbon" }));
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}/items";
        var item = await ReadAsync(await client.PostAsJsonAsync(url, new { name = "Original", category = "health" }));
        using var body = new StringContent("{\"name\":\"Changed\",\"category\":" + category + "}", Encoding.UTF8, "application/json");
        var itemUrl = $"/items/{item.GetProperty("id").GetGuid()}";
        var response = await client.PatchAsync(itemUrl, body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var createBody = new StringContent("{\"name\":\"Changed\",\"category\":" + category + "}", Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync(url, createBody)).StatusCode);
        var unchanged = await client.GetFromJsonAsync<JsonElement>(itemUrl);
        Assert.Equal("Original", unchanged.GetProperty("name").GetString());
        Assert.Equal("health", unchanged.GetProperty("category").GetString());
        Assert.Single((await client.GetFromJsonAsync<JsonElement>(url)).EnumerateArray());
    }

    private static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
