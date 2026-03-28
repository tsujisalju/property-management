using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PropertyApi.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string CognitoSub { get; set; } = "";
    [Required] public string FullName { get; set; } = "";
    [Required] public string Email { get; set; } = "";
    public string? Phone { get; set; }
    [Required] public string Role { get; set; } = "tenant"; // manager | tenant | maintenance_staff | admin
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Property> ManagedProperties { get; set; } = [];
    public ICollection<Lease> Leases { get; set; } = [];
    public ICollection<MaintenanceRequest> MaintenanceRequests { get; set; } = [];
    public ICollection<MaintenanceRequest> AssignedRequests { get; set; } = [];
}

public class Property
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ManagerId { get; set; }
    [Required] public string Name { get; set; } = "";
    [Required] public string Address { get; set; } = "";
    [Required] public string City { get; set; } = "";
    public int TotalUnits { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ManagerId))]
    public User Manager { get; set; } = null!;
    public ICollection<Unit> Units { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
}

public class Unit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PropertyId { get; set; }
    [Required] public string UnitNumber { get; set; } = "";
    public int? Floor { get; set; }
    public int Bedrooms { get; set; } = 1;
    public decimal RentAmount { get; set; }
    public string Status { get; set; } = "vacant"; // vacant | occupied | maintenance

    [ForeignKey(nameof(PropertyId))]
    public Property Property { get; set; } = null!;
    public ICollection<Lease> Leases { get; set; } = [];
    public ICollection<MaintenanceRequest> MaintenanceRequests { get; set; } = [];
}

public class Lease
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UnitId { get; set; }
    public Guid TenantId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal MonthlyRent { get; set; }
    public string Status { get; set; } = "active"; // active | expired | terminated
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UnitId))]  public Unit Unit { get; set; } = null!;
    [ForeignKey(nameof(TenantId))] public User Tenant { get; set; } = null!;
    public ICollection<Invoice> Invoices { get; set; } = [];
}

public class MaintenanceRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UnitId { get; set; }
    public Guid TenantId { get; set; }
    public Guid? AssignedTo { get; set; }
    [Required] public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string Category { get; set; } = "general"; // plumbing | electrical | hvac | general
    public string Priority { get; set; } = "medium";  // low | medium | high | emergency
    public string Status { get; set; } = "open";      // open | in_progress | resolved | closed
    public string? S3PhotoKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    [ForeignKey(nameof(UnitId))]    public Unit Unit { get; set; } = null!;
    [ForeignKey(nameof(TenantId))]  public User Tenant { get; set; } = null!;
    [ForeignKey(nameof(AssignedTo))] public User? Assignee { get; set; }
    public ICollection<MaintenanceComment> Comments { get; set; } = [];
}

public class MaintenanceComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequestId { get; set; }
    public Guid AuthorId { get; set; }
    [Required] public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(RequestId))] public MaintenanceRequest Request { get; set; } = null!;
    [ForeignKey(nameof(AuthorId))]  public User Author { get; set; } = null!;
}

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LeaseId { get; set; }
    public string Type { get; set; } = "rent"; // rent | maintenance | deposit | penalty
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public DateOnly? PaidDate { get; set; }
    public string Status { get; set; } = "pending"; // pending | paid | overdue | cancelled
    public string? S3PdfKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(LeaseId))] public Lease Lease { get; set; } = null!;
}

public class Budget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PropertyId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    [Required] public string Category { get; set; } = "";
    public decimal Allocated { get; set; }
    public decimal Spent { get; set; }

    [ForeignKey(nameof(PropertyId))] public Property Property { get; set; } = null!;
}
