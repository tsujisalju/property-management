using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyApi.DTOs;
using PropertyApi.Models;
using PropertyApi.Services;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/properties")]
public class PropertiesController(AppDbContext db, ICurrentUserService currentUser, IS3Service s3) : ControllerBase
{
    // GET /api/properties — returns properties managed by the current user
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var manager = await currentUser.GetCurrentUserAsync();

        var query = db.Properties.AsQueryable();
        if (manager is not null)
            query = query.Where(p => p.ManagerId == manager.Id);

        var properties = await query.OrderBy(p => p.Name).Select(p => ToResponse(p)).ToListAsync();
        return Ok(properties);
    }

    // GET /api/properties/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var property = await db.Properties
            .Include(p => p.Units)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (property is null) return NotFound();

        return Ok(ToDetailResponse(property));
    }

    // POST /api/properties
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePropertyRequest dto)
    {
        var manager = await currentUser.RequireCurrentUserAsync();

        var property = new Property
        {
            ManagerId  = manager.Id,
            Name       = dto.Name,
            Address    = dto.Address,
            City       = dto.City,
            TotalUnits = dto.TotalUnits,
        };

        db.Properties.Add(property);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = property.Id }, ToResponse(property));
    }

    // PATCH /api/properties/{id}
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest dto)
    {
        var property = await db.Properties.FindAsync(id);
        if (property is null) return NotFound();

        if (dto.Name       is not null) property.Name       = dto.Name;
        if (dto.Address    is not null) property.Address    = dto.Address;
        if (dto.City       is not null) property.City       = dto.City;
        if (dto.TotalUnits is not null) property.TotalUnits = dto.TotalUnits.Value;
        if (dto.S3PhotoKey is not null) property.S3PhotoKey = dto.S3PhotoKey;

        await db.SaveChangesAsync();
        return Ok(ToResponse(property));
    }

    // POST /api/properties/{id}/photo-upload-url
    [HttpPost("{id:guid}/photo-upload-url")]
    public async Task<IActionResult> GetPhotoUploadUrl(Guid id, [FromQuery] string contentType = "image/jpeg")
    {
        var property = await db.Properties.FindAsync(id);
        if (property is null) return NotFound();

        var key = $"properties/{id}/photo-{Guid.NewGuid()}.jpg";
        var uploadUrl = await s3.GetUploadUrlAsync(key, contentType);

        return Ok(new PresignedUrlResponse(uploadUrl, key));
    }

    // GET /api/properties/{id}/photo-url
    [HttpGet("{id:guid}/photo-url")]
    public async Task<IActionResult> GetPhotoUrl(Guid id)
    {
        var property = await db.Properties.FindAsync(id);
        if (property is null) return NotFound();
        if (property.S3PhotoKey is null) return NotFound("No photo attached.");

        var url = await s3.GetDownloadUrlAsync(property.S3PhotoKey);
        return Ok(new { url });
    }

    // GET /api/properties/{id}/units
    [HttpGet("{id:guid}/units")]
    public async Task<IActionResult> GetUnits(Guid id)
    {
        var exists = await db.Properties.AnyAsync(p => p.Id == id);
        if (!exists) return NotFound();

        var units = await db.Units
            .Where(u => u.PropertyId == id)
            .OrderBy(u => u.UnitNumber)
            .Select(u => ToUnitResponse(u))
            .ToListAsync();

        return Ok(units);
    }

    // POST /api/properties/{id}/units
    [HttpPost("{id:guid}/units")]
    public async Task<IActionResult> CreateUnit(Guid id, [FromBody] CreateUnitRequest dto)
    {
        var exists = await db.Properties.AnyAsync(p => p.Id == id);
        if (!exists) return NotFound();

        var unit = new Unit
        {
            PropertyId = id,
            UnitNumber = dto.UnitNumber,
            Floor      = dto.Floor,
            Bedrooms   = dto.Bedrooms,
            RentAmount = dto.RentAmount,
            Status     = "vacant",
        };

        db.Units.Add(unit);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetUnits), new { id }, ToUnitResponse(unit));
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private static PropertyResponse ToResponse(Property p) => new(
        p.Id, p.Name, p.Address, p.City, p.TotalUnits, p.S3PhotoKey, p.CreatedAt
    );

    private static PropertyDetailResponse ToDetailResponse(Property p) => new(
        p.Id, p.Name, p.Address, p.City, p.TotalUnits, p.S3PhotoKey, p.CreatedAt,
        p.Units.OrderBy(u => u.UnitNumber).Select(ToUnitResponse)
    );

    private static UnitResponse ToUnitResponse(Unit u) => new(
        u.Id, u.PropertyId, u.UnitNumber, u.Floor, u.Bedrooms, u.RentAmount, u.Status
    );
}
