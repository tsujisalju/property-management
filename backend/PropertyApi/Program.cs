using Amazon.S3;
using Amazon.SimpleEmailV2;
using Microsoft.EntityFrameworkCore;
using PropertyApi;
using PropertyApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers + Swagger ──────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Property Management API", Version = "v1" });
});

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ── AWS Services ───────────────────────────────────────────────────────────
// In development: reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from .env
// In production on EC2: uses the instance's IAM role automatically (no keys needed)
builder.Services.AddDefaultAWSOptions(builder.Configuration.GetAWSOptions());
builder.Services.AddAWSService<IAmazonS3>();
builder.Services.AddAWSService<IAmazonSimpleEmailServiceV2>();

// ── Application Services ───────────────────────────────────────────────────
builder.Services.AddScoped<IS3Service, S3Service>();
builder.Services.AddScoped<IEmailService, EmailService>();

// ── CORS ───────────────────────────────────────────────────────────────────
// Allows the Next.js dev server (localhost:3000) and Vercel production URL
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration
            .GetSection("AllowedOrigins")
            .Get<string[]>() ?? ["http://localhost:3000"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Auto-run DB migrations on startup ─────────────────────────────────────
// Convenient for Docker Compose so you don't need a separate migration step
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();
