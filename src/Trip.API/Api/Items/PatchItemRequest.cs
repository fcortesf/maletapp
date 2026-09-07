using System.Reflection;
using System.Text.Json;

namespace Trip.API.Api.Items;

public sealed class PatchItemRequest
{
    public string? Name { get; init; }
    public bool HasName { get; init; }
    public Guid? DefaultItemId { get; init; }
    public bool HasDefaultItemId { get; init; }
    public bool IsPacked { get; init; }
    public bool HasIsPacked { get; init; }

    public static async ValueTask<PatchItemRequest?> BindAsync(HttpContext context, ParameterInfo parameter)
    {
        var request = context.Request;

        if (request.ContentLength is 0)
        {
            return new PatchItemRequest();
        }

        using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: context.RequestAborted).ConfigureAwait(false);
        var root = document.RootElement;

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

        return new PatchItemRequest
        {
            Name = name,
            HasName = hasName,
            DefaultItemId = defaultItemId,
            HasDefaultItemId = hasDefaultItemId,
            IsPacked = isPacked,
            HasIsPacked = hasIsPacked
        };
    }
}
