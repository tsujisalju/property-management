using Microsoft.EntityFrameworkCore;
using PropertyApi.Models;

namespace PropertyApi;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Lease> Leases => Set<Lease>();
    public DbSet<MaintenanceRequest> MaintenanceRequests => Set<MaintenanceRequest>();
    public DbSet<MaintenanceComment> MaintenanceComments => Set<MaintenanceComment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Budget> Budgets => Set<Budget>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Users
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.CognitoSub).IsUnique();

        // Units: unit_number is unique per property
        modelBuilder.Entity<Unit>()
            .HasIndex(u => new { u.PropertyId, u.UnitNumber }).IsUnique();

        // Budgets: one row per property/year/month/category
        modelBuilder.Entity<Budget>()
            .HasIndex(b => new { b.PropertyId, b.Year, b.Month, b.Category }).IsUnique();
    }
}
