using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using PropertyApi.DTOs;
using PropertyApi.Services;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(ICurrentUserService currentUser, AppDbContext db) : ControllerBase
{
    // GET /api/users/me
    // Auto-provisions a tenant DB record on first login if none exists for this Cognito sub.
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var sub = HttpContext.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(sub)) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.CognitoSub == sub);

        if (user is null)
        {
            var email    = HttpContext.User.FindFirst("email")?.Value ?? "";
            var fullName = HttpContext.User.FindFirst("name")?.Value
                        ?? email;
            user = new PropertyApi.Models.User
            {
                CognitoSub = sub,
                Email      = email,
                FullName   = fullName,
                Role       = "tenant",
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        return Ok(new UserResponse(user.Id, user.FullName, user.Email, user.Phone, user.Role, user.CreatedAt));
    }

    // PATCH /api/users/me — only fullName and phone are updatable
    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserRequest dto)
    {
        var user = await currentUser.RequireCurrentUserAsync();
        if (dto.FullName is not null) user.FullName = dto.FullName;
        if (dto.Phone is not null)    user.Phone    = dto.Phone;
        await db.SaveChangesAsync();
        return Ok(new UserResponse(user.Id, user.FullName, user.Email, user.Phone, user.Role, user.CreatedAt));
    }

    // GET /api/users?role=maintenance_staff
    [HttpGet]
    public async Task<IActionResult> ListByRole([FromQuery] string? role)
    {
        var query = db.Users.AsQueryable();
        if (role is not null)
            query = query.Where(u => u.Role == role);
        var users = await query
            .OrderBy(u => u.FullName)
            .Select(u => new UserResponse(u.Id, u.FullName, u.Email, u.Phone, u.Role, u.CreatedAt))
            .ToListAsync();
        return Ok(users);
    }
}
