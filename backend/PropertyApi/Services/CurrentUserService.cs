using Microsoft.EntityFrameworkCore;
using PropertyApi.Models;

namespace PropertyApi.Services;

public interface ICurrentUserService
{
    Task<User?> GetCurrentUserAsync();
    Task<User> RequireCurrentUserAsync();
}

public class CurrentUserService(IHttpContextAccessor http, AppDbContext db) : ICurrentUserService
{
    public async Task<User?> GetCurrentUserAsync()
    {
        var sub = http.HttpContext?.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(sub)) return null;
        return await db.Users.FirstOrDefaultAsync(u => u.CognitoSub == sub);
    }

    public async Task<User> RequireCurrentUserAsync()
    {
        var user = await GetCurrentUserAsync();
        if (user is null) throw new UnauthorizedAccessException("Authenticated user not found in database.");
        return user;
    }
}
