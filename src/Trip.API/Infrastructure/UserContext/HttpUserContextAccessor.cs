using System.Security.Claims;
using Trip.API.Application.Abstractions;
using Trip.API.Domain.ValueObjects;

namespace Trip.API.Infrastructure.UserContext;

public sealed class HttpUserContextAccessor : IUserContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpUserContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public UserId? GetCurrentUserId()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return null;
        }

        if (httpContext.Request.Headers.TryGetValue(UserContextHeaderNames.TestUserId, out var values)
            && Guid.TryParse(values.SingleOrDefault(), out var testUserId))
        {
            return UserId.FromGuid(testUserId);
        }

        var claimValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claimValue, out var claimUserId)
            ? UserId.FromGuid(claimUserId)
            : null;
    }
}
