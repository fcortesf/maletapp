using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Abstractions;

/// <summary>
/// Resolves the current user for the active request or invocation.
/// This is the only identity seam visible to application handlers.
/// </summary>
public interface IUserContextAccessor
{
    UserId? GetCurrentUserId();
}
