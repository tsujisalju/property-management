using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyApi.Models;
using PropertyApi.DTOs;

namespace PropertyApi.Controllers;

[ApiController]
[Route("api/budgets")]
public class BudgetsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? propertyId,
        [FromQuery] int? year,
        [FromQuery] int? month)
    {
        var query = db.Budgets.AsQueryable();

        if (propertyId.HasValue) query = query.Where(b => b.PropertyId == propertyId.Value);
        if (year.HasValue) query = query.Where(b => b.Year == year.Value);
        if (month.HasValue) query = query.Where(b => b.Month == month.Value);

        var budgets = await query
            .OrderBy(b => b.Category)
            .Select(b => ToResponse(b))
            .ToListAsync();

        return Ok(budgets);
    }

 
    [HttpPut]
    public async Task<IActionResult> Upsert(
        [FromQuery] Guid propertyId,
        [FromBody] UpsertBudgetRequest req)
    {
        if (propertyId == Guid.Empty)
            return BadRequest(new { error = "propertyId query parameter is required." });

        if (req.Allocated < 0)
            return BadRequest(new { error = "Allocated amount cannot be negative." });

        var propertyExists = await db.Properties.AnyAsync(p => p.Id == propertyId);
        if (!propertyExists)
            return BadRequest(new { error = "Property not found." });

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO budgets (id, property_id, year, month, category, allocated, spent)
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, 0)
            ON CONFLICT (property_id, year, month, category)
            DO UPDATE SET allocated = EXCLUDED.allocated
            """,
            Guid.NewGuid(),
            propertyId,
            req.Year,
            req.Month,
            req.Category,
            req.Allocated);

        var budget = await db.Budgets.FirstOrDefaultAsync(b =>
            b.PropertyId == propertyId &&
            b.Year == req.Year &&
            b.Month == req.Month &&
            b.Category == req.Category);

        if (budget is null)
            return StatusCode(500, new { error = "Upsert succeeded but row could not be retrieved." });

        return Ok(ToResponse(budget));
    }

 
    [HttpPost("record-spend")]
    public async Task<IActionResult> RecordSpend([FromBody] RecordSpendRequest req)
    {
        if (req.Amount <= 0)
            return BadRequest(new { error = "Amount must be greater than zero." });

        var rowsAffected = await db.Database.ExecuteSqlRawAsync("""
            UPDATE budgets
            SET    spent = spent + {0}
            WHERE  property_id = {1}
              AND  year         = {2}
              AND  month        = {3}
              AND  category     = {4}
            """,
            req.Amount,
            req.PropertyId,
            req.Year,
            req.Month,
            req.Category);

        if (rowsAffected == 0)
            return NotFound(new { error = "No budget row found for the given property/year/month/category." });

        return Ok(new { message = "Spend recorded.", amountAdded = req.Amount });
    }

 
    private static BudgetResponse ToResponse(Budget b) =>
        new(b.Id, b.PropertyId, b.Year, b.Month, b.Category, b.Allocated, b.Spent);
}