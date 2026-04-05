namespace PropertyApi.DTOs;

// ── Health ─────────────────────────────────────────────────────────────────

public record HealthResponse(string Status, string Environment, string Database, DateTime Timestamp);

// ── Users ──────────────────────────────────────────────────────────────────

public record UserResponse(Guid Id, string FullName, string Email, string? Phone, string Role, DateTime CreatedAt);

public record UpdateUserRequest(string? FullName, string? Phone);

// ── Properties ─────────────────────────────────────────────────────────────

public record PropertyResponse(Guid Id, string Name, string Address, string City, int TotalUnits, DateTime CreatedAt);

public record PropertyDetailResponse(Guid Id, string Name, string Address, string City, int TotalUnits, DateTime CreatedAt, IEnumerable<UnitResponse> Units);

public record CreatePropertyRequest(
    string Name,
    string Address,
    string City,
    int TotalUnits
);

// ── Units ──────────────────────────────────────────────────────────────────

public record UnitResponse(Guid Id, Guid PropertyId, string UnitNumber, int? Floor, int Bedrooms, decimal RentAmount, string Status);

public record CreateUnitRequest(
    string UnitNumber,
    int? Floor,
    int Bedrooms,
    decimal RentAmount
);

// ── Leases ─────────────────────────────────────────────────────────────────

public record LeaseResponse(Guid Id, Guid UnitId, Guid TenantId, string TenantName, DateOnly StartDate, DateOnly EndDate, decimal MonthlyRent, string Status);

public record CreateLeaseRequest(
    Guid UnitId,
    Guid TenantId,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal MonthlyRent
);

// ── Maintenance requests ────────────────────────────────────────────────────

public record MaintenanceRequestResponse(
    Guid Id,
    Guid UnitId,
    string UnitNumber,
    string PropertyName,
    Guid TenantId,
    string TenantName,
    Guid? AssignedTo,
    string? AssigneeName,
    string Title,
    string? Description,
    string Category,
    string Priority,
    string Status,
    string? S3PhotoKey,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);

public record MaintenanceRequestDetailResponse(
    Guid Id,
    Guid UnitId,
    string UnitNumber,
    string PropertyName,
    Guid TenantId,
    string TenantName,
    Guid? AssignedTo,
    string? AssigneeName,
    string Title,
    string? Description,
    string Category,
    string Priority,
    string Status,
    string? S3PhotoKey,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    IEnumerable<CommentResponse> Comments
);

public record CreateMaintenanceRequestRequest(
    Guid UnitId,
    string Title,
    string? Description,
    string Category,
    string Priority
);

public record UpdateMaintenanceRequestRequest(
    string? Status,
    Guid? AssignedTo,
    string? Priority
);

// ── Maintenance comments ────────────────────────────────────────────────────

public record CommentResponse(Guid Id, Guid AuthorId, string AuthorName, string Body, DateTime CreatedAt);

public record CreateCommentRequest(string Body);

// ── S3 presigned URL ────────────────────────────────────────────────────────

public record PresignedUrlResponse(string UploadUrl, string Key);

// ── Invoices ───────────────────────────────────────────────────────────────

public record InvoiceResponse(Guid Id, Guid LeaseId, string Type, decimal Amount, DateOnly DueDate, DateOnly? PaidDate, string Status, string? S3PdfKey, DateTime CreatedAt);

public record CreateInvoiceRequest(
    Guid LeaseId,
    string Type,
    decimal Amount,
    DateOnly DueDate
);

// ── Budgets ────────────────────────────────────────────────────────────────

public record BudgetResponse(Guid Id, Guid PropertyId, int Year, int Month, string Category, decimal Allocated, decimal Spent);

public record UpsertBudgetRequest(
    int Year,
    int Month,
    string Category,
    decimal Allocated
);
