using Trip.API.Domain.ValueObjects;

namespace Trip.API.Application.Abstractions;

public interface IUserContextAccessor
{
    UserId? GetCurrentUserId();
}
