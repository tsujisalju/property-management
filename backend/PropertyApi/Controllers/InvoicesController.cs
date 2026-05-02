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
    IInvoicePdfService pdfService) : ControllerBase
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

    // ── Projection helper 
    private static InvoiceResponse ToResponse(Invoice i) =>
        new(i.Id, i.LeaseId, i.Type, i.Amount, i.DueDate,
            i.PaidDate, i.Status, i.S3PdfKey, i.CreatedAt);
}