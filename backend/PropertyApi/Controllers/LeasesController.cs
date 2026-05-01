using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyApi.DTOs;
using PropertyApi.Models;
using PropertyApi.Services;

namespace PropertyApi.Controllers;

[ApiController]                    // marks this as an API controller
[Route("api/leases")]              // all routes start with /api/leases
[Authorize]                        // every endpoint requires a valid JWT cookie
public class LeasesController(
    AppDbContext db,               // database access
    ICurrentUserService currentUser, // reads who's logged in from JWT
    IEmailService email            // SES email sender
) : ControllerBase
{
    // ── GET /api/leases ───────────────────────────────────────────────────
    // Returns all leases belonging to the currently logged-in tenant.
    // Includes unit + property so the frontend can show full details.
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Step 1: who is making this request?
        // GetCurrentUserAsync() returns null if not found (soft version)
        // RequireCurrentUserAsync() throws 401 if not found (strict version)
        var user = await currentUser.GetCurrentUserAsync();

        // Step 2: build the query
        var query = db.Leases
            .Include(l => l.Unit)               // joins units table
                .ThenInclude(u => u.Property)   // joins properties table
            .Include(l => l.Tenant)             // joins users table
            .AsQueryable();

        // Step 3: if user is found and is a tenant, filter to only their leases
        // If no auth (dev mode), return all leases
        if (user is not null && user.Role == "tenant")
            query = query.Where(l => l.TenantId == user.Id);

        var leases = await query
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => ToResponse(l))         // map to DTO (never expose raw models)
            .ToListAsync();

        return Ok(leases);
    }

    // ── GET /api/leases/{id} ──────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var lease = await db.Leases
            .Include(l => l.Unit).ThenInclude(u => u.Property)
            .Include(l => l.Tenant)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lease is null) return NotFound();
        return Ok(ToResponse(lease));
    }

    // ── POST /api/leases ──────────────────────────────────────────────────
    // Creates a lease and marks the unit as occupied.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeaseRequest dto)
    {
        // Step 1: get the logged-in user (throws 401 if missing)
        var tenant = await currentUser.RequireCurrentUserAsync();

        // Step 2: find the unit
        var unit = await db.Units
            .Include(u => u.Property)
            .FirstOrDefaultAsync(u => u.Id == dto.UnitId);

        if (unit is null)
            return BadRequest("Unit not found.");

        // Step 3: make sure the unit is actually available
        if (unit.Status != "vacant")
            return BadRequest($"Unit is not available (status: {unit.Status}).");

        // Step 4: create the lease record
        var lease = new Lease
        {
            UnitId = dto.UnitId,
            TenantId = tenant.Id,   // always use the JWT user, not dto
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            MonthlyRent = dto.MonthlyRent,
            Status = "active",
        };

        // Step 5: sync unit status
        unit.Status = "occupied";

        // Step 6: save both changes in ONE transaction
        db.Leases.Add(lease);
        await db.SaveChangesAsync();

        // Step 7: send welcome email via SES
        await email.SendAsync(
            tenant.Email,
            "Lease Confirmed",
            $"<h2>Your lease has been confirmed.</h2>" +
            $"<p>Unit <strong>{unit.UnitNumber}</strong> at {unit.Property?.Name}</p>" +
            $"<p>From {lease.StartDate} to {lease.EndDate} at RM {lease.MonthlyRent}/month.</p>"
        );

        // Step 8: return 201 Created with the new lease
        return CreatedAtAction(nameof(GetById), new { id = lease.Id }, ToResponse(lease));
    }

    // ── PATCH /api/leases/{id}/terminate ──────────────────────────────────
    // Terminates an active lease and frees up the unit.
    [HttpPatch("{id:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid id)
    {
        var tenant = await currentUser.RequireCurrentUserAsync();

        // Load lease + unit together
        var lease = await db.Leases
            .Include(l => l.Unit).ThenInclude(u => u.Property)
            .Include(l => l.Tenant)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lease is null) return NotFound();

        // Security check: tenants can only terminate their own lease
        if (lease.TenantId != tenant.Id)
            return Forbid();

        // Can only terminate an active lease
        if (lease.Status != "active")
            return BadRequest($"Cannot terminate a lease with status '{lease.Status}'.");

        // Update both records
        lease.Status = "terminated";
        lease.Unit.Status = "vacant";   // sync unit back to available

        await db.SaveChangesAsync();

        // Notify tenant by email
        await email.SendAsync(
            tenant.Email,
            "Lease Terminated",
            $"<h2>Your lease has been terminated.</h2>" +
            $"<p>Unit <strong>{lease.Unit.UnitNumber}</strong> at " +
            $"{lease.Unit.Property?.Name} is now vacant.</p>"
        );

        return NoContent(); // 204 — success, nothing to return
    }

    // ── Mapping helper ────────────────────────────────────────────────────
    // Converts a Lease entity (database model) to a LeaseResponse DTO.
    // We NEVER return raw EF entities — they cause circular reference issues
    // and expose internal fields. Always map to a DTO first.
    private static LeaseResponse ToResponse(Lease l) => new(
        l.Id,
        l.UnitId,
        l.Unit?.UnitNumber ?? "",
        l.Unit?.Property?.Name ?? "",
        l.TenantId,
        l.Tenant?.FullName ?? "",
        l.StartDate,
        l.EndDate,
        l.MonthlyRent,
        l.Status
    );
}