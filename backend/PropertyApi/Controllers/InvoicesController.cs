using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyApi.Models;
using PropertyApi.DTOs;
using PropertyApi.Services;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/invoices")]
public class InvoicesController(
    AppDbContext db,
    IS3Service s3,
    IInvoicePdfService pdfService,
    IEmailService email) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? leaseId,
        [FromQuery] string? status)
    {
        var query = db.Invoices.AsQueryable();

        if (leaseId.HasValue)
            query = query.Where(i => i.LeaseId == leaseId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(i => i.Status == status);

        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => ToResponse(i))
            .ToListAsync();

        return Ok(invoices);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();

        return Ok(ToResponse(invoice));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest req)
    {
        var leaseExists = await db.Leases.AnyAsync(l => l.Id == req.LeaseId);
        if (!leaseExists)
            return BadRequest(new { error = "Lease not found. Provide a valid leaseId." });

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            LeaseId = req.LeaseId,
            Type = req.Type,
            Amount = req.Amount,
            DueDate = req.DueDate,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        // For maintenance invoices, increment budget spent for the given category
        if (req.Type == "maintenance" && req.Category is not null)
        {
            var leaseWithUnit = await db.Leases
                .Include(l => l.Unit)
                .ThenInclude(u => u.Property)
                .FirstOrDefaultAsync(l => l.Id == req.LeaseId);

            var unit = leaseWithUnit?.Unit;
            if (unit?.Property is not null)
            {
                var now = DateTime.UtcNow;
                await db.Database.ExecuteSqlRawAsync("""
                    UPDATE budgets
                    SET    spent = spent + {0}
                    WHERE  property_id = {1}
                      AND  year        = {2}
                      AND  month       = {3}
                      AND  category    = {4}
                    """,
                    req.Amount, unit.Property.Id, now.Year, now.Month, req.Category);
            }
        }

        // Payment reminder email — best-effort, SES may be unavailable in dev
        try
        {
            var lease = await db.Leases
                .Include(l => l.Tenant)
                .FirstOrDefaultAsync(l => l.Id == req.LeaseId);
            if (lease?.Tenant is not null)
                await email.SendAsync(
                    lease.Tenant.Email,
                    "Invoice Due",
                    $"<p>A new invoice of <strong>MYR {req.Amount:F2}</strong> ({req.Type}) is due on {req.DueDate}.</p>"
                );
        }
        catch { /* swallow — SES unavailable in dev */ }

        return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, ToResponse(invoice));
    }

  
    [HttpPatch("{id:guid}/mark-paid")]
    public async Task<IActionResult> MarkPaid(Guid id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();

        if (invoice.Status == "paid")
            return Ok(ToResponse(invoice));

        invoice.Status = "paid";
        invoice.PaidDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var pdfBytes = pdfService.Generate(invoice);
        var s3Key = $"invoices/{invoice.Id}/invoice.pdf";
        await s3.UploadAsync(s3Key, pdfBytes, "application/pdf");
        invoice.S3PdfKey = s3Key;

        await db.SaveChangesAsync();

        return Ok(ToResponse(invoice));
    }

    [HttpGet("{id:guid}/pdf-url")]
    public async Task<IActionResult> GetPdfUrl(Guid id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();

        if (invoice.S3PdfKey is null)
            return NotFound(new { error = "No PDF available for this invoice. Mark it as paid first." });

        var url = await s3.GetDownloadUrlAsync(invoice.S3PdfKey);
        return Ok(new { url });
    }

    // ── Receipt upload ────────────────────────────────────────────────────────

    private static readonly HashSet<string> AllowedReceiptContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
    };

    private static string NormalizeReceiptContentType(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType)) return "image/jpeg";
        var normalized = contentType.Trim().ToLowerInvariant();
        return AllowedReceiptContentTypes.Contains(normalized) ? normalized : "image/jpeg";
    }

    private static string GetReceiptExtension(string contentType) => contentType switch
    {
        "application/pdf" => "pdf",
        "image/png"       => "png",
        "image/webp"      => "webp",
        _                 => "jpg",
    };

    // POST /api/invoices/{id}/receipt-upload-url — returns pre-signed S3 PUT URL
    [HttpPost("{id:guid}/receipt-upload-url")]
    public async Task<IActionResult> GetReceiptUploadUrl(Guid id, [FromQuery] string contentType = "image/jpeg")
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();

        var normalized = NormalizeReceiptContentType(contentType);
        var extension  = GetReceiptExtension(normalized);
        var key        = $"invoices/{id}/receipt-{Guid.NewGuid()}.{extension}";
        var uploadUrl  = await s3.GetUploadUrlAsync(key, normalized);

        return Ok(new PresignedUrlResponse(uploadUrl, key));
    }

    // PATCH /api/invoices/{id}/receipt-key — saves S3 key after browser upload completes
    [HttpPatch("{id:guid}/receipt-key")]
    public async Task<IActionResult> SaveReceiptKey(Guid id, [FromBody] SaveReceiptKeyRequest req)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();

        invoice.S3ReceiptKey = req.Key;
        if (invoice.Status == "pending" || invoice.Status == "overdue")
            invoice.Status = "under_review";
        await db.SaveChangesAsync();
        return Ok(ToResponse(invoice));
    }

    // GET /api/invoices/{id}/receipt-url — manager fetches pre-signed download URL
    [HttpGet("{id:guid}/receipt-url")]
    public async Task<IActionResult> GetReceiptUrl(Guid id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();

        if (invoice.S3ReceiptKey is null)
            return NotFound(new { error = "No receipt uploaded for this invoice." });

        var url = await s3.GetDownloadUrlAsync(invoice.S3ReceiptKey);
        return Ok(new { url });
    }

    // ── Projection helper ─────────────────────────────────────────────────────
    private static InvoiceResponse ToResponse(Invoice i) =>
        new(i.Id, i.LeaseId, i.Type, i.Amount, i.DueDate,
            i.PaidDate, i.Status, i.S3PdfKey, i.S3ReceiptKey, i.CreatedAt);
}