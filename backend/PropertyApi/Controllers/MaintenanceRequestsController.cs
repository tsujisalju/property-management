using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyApi.DTOs;
using PropertyApi.Models;
using PropertyApi.Services;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/maintenance-requests")]
public class MaintenanceRequestsController(AppDbContext db, IS3Service s3, ICurrentUserService currentUser, IEmailService email) : ControllerBase
{
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"
    };

    private static string NormalizeImageContentType(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            return "image/jpeg";

        var normalized = contentType.Trim().ToLowerInvariant();
        return AllowedImageContentTypes.Contains(normalized) ? normalized : "image/jpeg";
    }

    private static string GetFileExtensionFromContentType(string contentType) => contentType switch
    {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    };

    // GET /api/maintenance-requests
    // Managers see all requests for their properties.
    // Tenants see only their own requests.
    // Maintenance staff see requests assigned to them.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] Guid? unitId, [FromQuery] Guid? assignedTo)
    {
        var caller = await currentUser.GetCurrentUserAsync();

        var query = db.MaintenanceRequests
            .Include(r => r.Unit).ThenInclude(u => u.Property)
            .Include(r => r.Tenant)
            .Include(r => r.Assignee)
            .AsQueryable();

        if (caller?.Role == "tenant")
            query = query.Where(r => r.TenantId == caller.Id);

        if (status is not null)
            query = query.Where(r => r.Status == status);

        if (unitId is not null)
            query = query.Where(r => r.UnitId == unitId);

        if (assignedTo is not null)
            query = query.Where(r => r.AssignedTo == assignedTo);

        var results = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => ToResponse(r))
            .ToListAsync();

        return Ok(results);
    }

    // GET /api/maintenance-requests/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var request = await db.MaintenanceRequests
            .Include(r => r.Unit).ThenInclude(u => u.Property)
            .Include(r => r.Tenant)
            .Include(r => r.Assignee)
            .Include(r => r.Comments).ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request is null) return NotFound();
        return Ok(ToDetailResponse(request));
    }

    // GET /api/maintenance-requests/{id}/photo-url
    [HttpGet("{id:guid}/photo-url")]
    public async Task<IActionResult> GetPhotoUrl(Guid id)
    {
        var request = await db.MaintenanceRequests.FindAsync(id);
        if (request is null) return NotFound();
        if (request.S3PhotoKey is null) return NotFound("No photo attached.");

        var url = await s3.GetDownloadUrlAsync(request.S3PhotoKey);
        return Ok(new { url });
    }

    // POST /api/maintenance-requests
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMaintenanceRequestRequest dto)
    {
        var unit = await db.Units.FindAsync(dto.UnitId);
        if (unit is null) return BadRequest("Unit not found.");

        var tenant = await currentUser.RequireCurrentUserAsync();

        var request = new MaintenanceRequest
        {
            UnitId      = dto.UnitId,
            TenantId    = tenant.Id,
            Title       = dto.Title,
            Description = dto.Description,
            Category    = dto.Category,
            Priority    = dto.Priority,
        };

        db.MaintenanceRequests.Add(request);
        await db.SaveChangesAsync();

        try
        {
            await email.SendAsync(
                tenant.Email,
                "Maintenance Request Received",
                $"<h2>Your request has been received.</h2>" +
                $"<p><strong>{request.Title}</strong> — {request.Category}, {request.Priority} priority</p>" +
                $"<p>We'll update you as work progresses.</p>"
            );
        }
        catch { /* SES unavailable in dev — swallow */ }

        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request.Id);
    }

    // PATCH /api/maintenance-requests/{id}
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMaintenanceRequestRequest dto)
    {
        var request = await db.MaintenanceRequests.FindAsync(id);
        if (request is null) return NotFound();

        if (dto.Status is not null)
        {
            request.Status = dto.Status;
            if (dto.Status == "resolved") request.ResolvedAt = DateTime.UtcNow;
        }
        if (dto.ClearAssignee == true)
            request.AssignedTo = null;
        else if (dto.AssignedTo is not null)
            request.AssignedTo = dto.AssignedTo;
        if (dto.Priority    is not null) request.Priority    = dto.Priority;
        if (dto.Title       is not null) request.Title       = dto.Title;
        if (dto.Description is not null) request.Description = dto.Description;
        if (dto.Category    is not null) request.Category    = dto.Category;
        if (dto.S3PhotoKey  is not null) request.S3PhotoKey  = dto.S3PhotoKey;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/maintenance-requests/{id}/comments
    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] CreateCommentRequest dto)
    {
        var request = await db.MaintenanceRequests.FindAsync(id);
        if (request is null) return NotFound();

        var author = await currentUser.RequireCurrentUserAsync();

        var comment = new MaintenanceComment
        {
            RequestId = id,
            AuthorId  = author.Id,
            Body      = dto.Body,
        };

        db.MaintenanceComments.Add(comment);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id }, comment.Id);
    }

    // POST /api/maintenance-requests/{id}/photo-upload-url
    // Returns a pre-signed S3 URL so the frontend can upload directly.
    // The frontend uploads to S3; then calls PATCH to save the key.
    [HttpPost("{id:guid}/photo-upload-url")]
    public async Task<IActionResult> GetPhotoUploadUrl(Guid id, [FromQuery] string contentType = "image/jpeg")
    {
        var request = await db.MaintenanceRequests.FindAsync(id);
        if (request is null) return NotFound();

        var normalizedContentType = NormalizeImageContentType(contentType);
        var extension = GetFileExtensionFromContentType(normalizedContentType);
        var key = $"maintenance/{id}/photo-{Guid.NewGuid()}.{extension}";
        var uploadUrl = await s3.GetUploadUrlAsync(key, normalizedContentType);

        return Ok(new PresignedUrlResponse(uploadUrl, key));
    }

    // DELETE /api/maintenance-requests/{id}
    // Only the tenant who created the request can delete it.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await currentUser.RequireCurrentUserAsync();

        var request = await db.MaintenanceRequests
            .Include(r => r.Comments)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request is null) return NotFound();

        // Security check: only the tenant who created it can delete it
        if (request.TenantId != user.Id)
            return Forbid();

        // Remove comments first (child records) then the request
        db.MaintenanceComments.RemoveRange(request.Comments);
        db.MaintenanceRequests.Remove(request);
        await db.SaveChangesAsync();

        return NoContent(); // 204 - success
    }

    // ── Mapping helpers ──────────────────────────────────────────────────────
    private static MaintenanceRequestResponse ToResponse(MaintenanceRequest r) => new(
        r.Id, r.UnitId, r.Unit?.UnitNumber ?? "",
        r.Unit?.Property?.Name ?? "",
        r.TenantId, r.Tenant?.FullName ?? "",
        r.AssignedTo, r.Assignee?.FullName,
        r.Title, r.Description, r.Category, r.Priority, r.Status,
        r.S3PhotoKey, r.CreatedAt, r.ResolvedAt
    );

    private static MaintenanceRequestDetailResponse ToDetailResponse(MaintenanceRequest r) => new(
        r.Id, r.UnitId, r.Unit?.UnitNumber ?? "",
        r.Unit?.Property?.Name ?? "",
        r.TenantId, r.Tenant?.FullName ?? "",
        r.AssignedTo, r.Assignee?.FullName,
        r.Title, r.Description, r.Category, r.Priority, r.Status,
        r.S3PhotoKey, r.CreatedAt, r.ResolvedAt,
        r.Comments?.OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponse(c.Id, c.AuthorId, c.Author?.FullName ?? "Unknown", c.Body, c.CreatedAt))
            ?? Enumerable.Empty<CommentResponse>()
    );
}
