using Microsoft.AspNetCore.Authorization;
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
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var user = await currentUser.GetCurrentUserAsync();
        if (user is null) return NotFound();
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
}
