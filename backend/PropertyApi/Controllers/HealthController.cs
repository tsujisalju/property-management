using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        // Ping the database so we know the connection string is correct
        var dbReachable = false;
        try
        {
            dbReachable = await db.Database.CanConnectAsync();
        }
        catch { /* swallow — we'll report false below */ }

        return Ok(new
        {
            status = dbReachable ? "ok" : "degraded",
            environment = env.EnvironmentName,
            database = dbReachable ? "connected" : "unreachable",
            timestamp = DateTime.UtcNow,
        });
    }
}
