using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyApi.DTOs;
using PropertyApi.Models;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/properties")]
public class PropertiesController(AppDbContext db) : ControllerBase
{
    // GET /api/properties
    // TODO: filter by authenticated manager's ID from JWT
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var properties = await db.Properties
            .OrderBy(p => p.Name)
            .Select(p => ToResponse(p))
            .ToListAsync();

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
        // TODO: replace with authenticated manager's ID from JWT
        var placeholderManagerId = Guid.Empty;

        var property = new Property
        {
            ManagerId  = placeholderManagerId,
            Name       = dto.Name,
            Address    = dto.Address,
            City       = dto.City,
            TotalUnits = dto.TotalUnits,
        };

        db.Properties.Add(property);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = property.Id }, ToResponse(property));
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
        p.Id, p.Name, p.Address, p.City, p.TotalUnits, p.CreatedAt
    );

    private static PropertyDetailResponse ToDetailResponse(Property p) => new(
        p.Id, p.Name, p.Address, p.City, p.TotalUnits, p.CreatedAt,
        p.Units.Select(ToUnitResponse)
    );

    private static UnitResponse ToUnitResponse(Unit u) => new(
        u.Id, u.PropertyId, u.UnitNumber, u.Floor, u.Bedrooms, u.RentAmount, u.Status
    );
}
