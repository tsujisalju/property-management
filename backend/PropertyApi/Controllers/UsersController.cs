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

    // PATCH /api/users/{id}/role — admin assigns a role to any user
    // TODO: add [Authorize(Roles = "admin")] once role-based auth is configured
    [HttpPatch("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleRequest dto)
    {
        var validRoles = new HashSet<string> { "manager", "tenant", "maintenance_staff", "admin" };
        if (!validRoles.Contains(dto.Role))
            return BadRequest($"Invalid role '{dto.Role}'. Must be one of: {string.Join(", ", validRoles)}.");

        var target = await db.Users.FindAsync(id);
        if (target is null) return NotFound();

        if (target.Role == "admin" && dto.Role != "admin")
        {
            var adminCount = await db.Users.CountAsync(u => u.Role == "admin");
            if (adminCount <= 1)
                return BadRequest("Cannot change the role of the last admin.");
        }

        target.Role = dto.Role;
        await db.SaveChangesAsync();
        return Ok(new UserResponse(target.Id, target.FullName, target.Email, target.Phone, target.Role, target.CreatedAt));
    }
}
