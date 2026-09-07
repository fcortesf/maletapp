using System.Reflection;
using System.Text.Json;

namespace Trip.API.Api.Items;

public sealed class PatchItemRequest
{
    public string? Name { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasName { get; init; }
    public Guid? DefaultItemId { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasDefaultItemId { get; init; }
    public bool IsPacked { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasIsPacked { get; init; }

    public string? Notes { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasNotes { get; init; }
    public int? ItemCount { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasItemCount { get; init; }

    public static async ValueTask<PatchItemRequest?> BindAsync(HttpContext context, ParameterInfo parameter)
    {
        var request = context.Request;

        if (request.ContentLength is 0)
        {
            return new PatchItemRequest();
        }

        using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: context.RequestAborted).ConfigureAwait(false);
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object)
            throw new BadHttpRequestException("The request body must be a JSON object.");

        string? name = null;
        var hasName = root.TryGetProperty("name", out var nameElement);
        if (hasName && nameElement.ValueKind != JsonValueKind.Null)
        {
            name = nameElement.GetString();
        }

        Guid? defaultItemId = null;
        var hasDefaultItemId = root.TryGetProperty("defaultItemId", out var defaultItemIdElement);
        if (hasDefaultItemId && defaultItemIdElement.ValueKind != JsonValueKind.Null)
        {
            if (defaultItemIdElement.ValueKind != JsonValueKind.String
                || !Guid.TryParse(defaultItemIdElement.GetString(), out var parsedDefaultItemId))
            {
                throw new BadHttpRequestException("The JSON value could not be converted to System.Guid.");
            }

            defaultItemId = parsedDefaultItemId;
        }

        var isPacked = false;
        var hasIsPacked = root.TryGetProperty("isPacked", out var isPackedElement);
        if (hasIsPacked)
        {
            if (isPackedElement.ValueKind is not JsonValueKind.True and not JsonValueKind.False)
            {
                throw new BadHttpRequestException("The JSON value could not be converted to System.Boolean.");
            }

            isPacked = isPackedElement.GetBoolean();
        }

        string? notes = null;
        var hasNotes = root.TryGetProperty("notes", out var notesElement);
        if (hasNotes && notesElement.ValueKind != JsonValueKind.Null)
        {
            if (notesElement.ValueKind != JsonValueKind.String)
                throw new BadHttpRequestException("Notes must be a string or null.");
            notes = notesElement.GetString();
        }

        int? itemCount = null;
        var hasItemCount = root.TryGetProperty("itemCount", out var countElement);
        if (hasItemCount && countElement.ValueKind != JsonValueKind.Null)
        {
            if (countElement.ValueKind != JsonValueKind.Number || !countElement.TryGetInt32(out var count))
                throw new BadHttpRequestException("Item count must be an integer or null.");
            itemCount = count;
        }

        return new PatchItemRequest
        {
            Name = name,
            HasName = hasName,
            DefaultItemId = defaultItemId,
            HasDefaultItemId = hasDefaultItemId,
            IsPacked = isPacked,
            HasIsPacked = hasIsPacked,
            Notes = notes,
            HasNotes = hasNotes,
            ItemCount = itemCount,
            HasItemCount = hasItemCount
        };
    }
}
