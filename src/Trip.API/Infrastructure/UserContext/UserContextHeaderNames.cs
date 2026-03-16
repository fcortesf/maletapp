namespace Trip.API.Infrastructure.UserContext;

public static class UserContextHeaderNames
{
    // Development and test environments may inject a user id through this header.
    // It is not a public production authentication contract.
    public const string TestUserId = "X-Test-User-Id";
}
