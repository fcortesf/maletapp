using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Trip.API.IntegrationTests.Infrastructure;

namespace Trip.API.IntegrationTests.Items;

public sealed class ItemDetailsEndpointTests
{
    [Fact]
    public async Task Details_Persist_Clear_AndRemainIndependentOfPackedStateAsync()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var tripResponse = await client.PostAsJsonAsync("/trips", new { destination = "Lisbon" });
        var trip = await tripResponse.Content.ReadFromJsonAsync<JsonElement>();
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}/items";
        var created = await client.PostAsJsonAsync(url, new { name = "Socks", notes = "Two pairs for walking", itemCount = 2 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var item = await created.Content.ReadFromJsonAsync<JsonElement>();
        var itemUrl = $"/items/{item.GetProperty("id").GetGuid()}";
        AssertDetails(item, "Two pairs for walking", 2);
        Assert.False(item.TryGetProperty("checkCount", out _));
        var packed = await client.PatchAsJsonAsync(itemUrl, new { isPacked = true });
        Assert.Equal(HttpStatusCode.OK, packed.StatusCode);
        AssertDetails(await packed.Content.ReadFromJsonAsync<JsonElement>(), "Two pairs for walking", 2);
        AssertDetails(await client.GetFromJsonAsync<JsonElement>(itemUrl), "Two pairs for walking", 2);
        var list = await client.GetFromJsonAsync<JsonElement>(url);
        AssertDetails(list[0], "Two pairs for walking", 2);
        using var other = factory.CreateApiClient();
        other.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PatchAsJsonAsync(itemUrl, new { notes = "Forbidden", itemCount = 9 })).StatusCode);
        using var anonymous = factory.CreateApiClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PatchAsJsonAsync(itemUrl, new { notes = "Forbidden", itemCount = 9 })).StatusCode);
        AssertDetails(await client.GetFromJsonAsync<JsonElement>(itemUrl), "Two pairs for walking", 2);
        var notesOnly = await client.PatchAsJsonAsync(itemUrl, new { notes = "Revised comment" });
        AssertDetails(await notesOnly.Content.ReadFromJsonAsync<JsonElement>(), "Revised comment", 2);
        var countOnly = await client.PatchAsJsonAsync(itemUrl, new { itemCount = 1 });
        AssertDetails(await countOnly.Content.ReadFromJsonAsync<JsonElement>(), "Revised comment", 1);
        var cleared = await client.PatchAsJsonAsync(itemUrl, new { notes = (string?)null, itemCount = (int?)null });
        var clearedItem = await cleared.Content.ReadFromJsonAsync<JsonElement>();
        AssertDetails(clearedItem, null, null);
        Assert.True(clearedItem.GetProperty("isPacked").GetBoolean());
        var updated = await client.PatchAsJsonAsync(itemUrl, new { notes = "", itemCount = int.MaxValue });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        AssertDetails(await client.GetFromJsonAsync<JsonElement>(itemUrl), "", int.MaxValue);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync(itemUrl + "/check-item", null)).StatusCode);
        foreach (var body in new object[] { new { name = "Omitted" }, new { name = "Null", notes = (string?)null, itemCount = (int?)null } })
        {
            var response = await client.PostAsJsonAsync(url, body);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            AssertDetails(await response.Content.ReadFromJsonAsync<JsonElement>(), null, null);
        }
    }

    [Theory]
    [InlineData("\"itemCount\":0")]
    [InlineData("\"itemCount\":-1")]
    [InlineData("\"itemCount\":1.5")]
    [InlineData("\"itemCount\":2147483648")]
    [InlineData("\"itemCount\":\"2\"")]
    [InlineData("\"itemCount\":true")]
    [InlineData("\"notes\":42")]
    [InlineData("\"notes\":[]")]
    public async Task InvalidDetails_Return400_WithoutChangingExistingItemAsync(string field)
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestUserContextHeaderNames.UserId, Guid.NewGuid().ToString());
        var tripResponse = await client.PostAsJsonAsync("/trips", new { destination = "Lisbon" });
        var trip = await tripResponse.Content.ReadFromJsonAsync<JsonElement>();
        var url = $"/trips/{trip.GetProperty("id").GetGuid()}/items";
        var created = await client.PostAsJsonAsync(url, new { name = "Keep", notes = "Original", itemCount = 2 });
        var item = await created.Content.ReadFromJsonAsync<JsonElement>();
        var itemUrl = $"/items/{item.GetProperty("id").GetGuid()}";
        using var postBody = new StringContent("{\"name\":\"Invalid\"," + field + "}", Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync(url, postBody)).StatusCode);
        using var patchBody = new StringContent("{\"name\":\"Changed\"," + field + "}", Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsync(itemUrl, patchBody)).StatusCode);
        var unchanged = await client.GetFromJsonAsync<JsonElement>(itemUrl);
        AssertDetails(unchanged, "Original", 2);
        Assert.Equal("Keep", unchanged.GetProperty("name").GetString());
        Assert.Equal(1, (await client.GetFromJsonAsync<JsonElement>(url)).GetArrayLength());
    }

    [Fact]
    public async Task Swagger_DescribesNewFields_AndOmitsRetiredActionAsync()
    {
        await using var factory = new TripApiFactory();
        using var client = factory.CreateApiClient();
        var schema = await client.GetFromJsonAsync<JsonElement>("/swagger/v1/swagger.json");
        var paths = schema.GetProperty("paths");
        Assert.False(paths.TryGetProperty("/items/{itemId}/check-item", out _));
        Assert.True(paths.GetProperty("/items/{itemId}").TryGetProperty("delete", out _));
        var schemas = schema.GetProperty("components").GetProperty("schemas");
        foreach (var name in new[] { "CreateItemInTripRequest", "PatchItemRequest", "ItemResponse" })
        {
            var properties = schemas.GetProperty(name).GetProperty("properties");
            Assert.True(properties.TryGetProperty("notes", out _));
            Assert.True(properties.TryGetProperty("itemCount", out _));
            Assert.False(properties.TryGetProperty("checkCount", out _));
            Assert.False(properties.TryGetProperty("hasNotes", out _));
        }
    }

    private static void AssertDetails(JsonElement item, string? notes, int? count)
    {
        Assert.Equal(notes, item.GetProperty("notes").GetString());
        Assert.Equal(count, item.GetProperty("itemCount").ValueKind == JsonValueKind.Null ? (int?)null : item.GetProperty("itemCount").GetInt32());
    }
}
