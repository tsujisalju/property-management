using Amazon.S3;
using Amazon.SimpleEmailV2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PropertyApi;
using PropertyApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers + Swagger ──────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Property Management API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Paste your Cognito ID token here",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
           .UseSnakeCaseNamingConvention());

// ── AWS Services ───────────────────────────────────────────────────────────
// In development: reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from .env
// In production on EC2: uses the instance's IAM role automatically (no keys needed)
builder.Services.AddDefaultAWSOptions(builder.Configuration.GetAWSOptions());
builder.Services.AddAWSService<IAmazonS3>();
builder.Services.AddAWSService<IAmazonSimpleEmailServiceV2>();

// ── Authentication (Cognito JWT) ──────────────────────────────────────────
// ASP.NET Core maps __ in env var names to : in config keys, so
// the docker-compose env var Jwt__Issuer is read as Jwt:Issuer here.
var jwtIssuer   = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (!string.IsNullOrWhiteSpace(jwtIssuer) && !string.IsNullOrWhiteSpace(jwtAudience)
    && !jwtIssuer.EndsWith("/local")) // skip the docker-compose placeholder value
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority        = jwtIssuer;
            options.Audience         = jwtAudience;
            options.MapInboundClaims = false; // keep "sub" as "sub", not remapped to nameidentifier URI
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidIssuer              = jwtIssuer,
                ValidateAudience         = true,
                ValidAudience            = jwtAudience,
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
            };
            // Read the token from the auth_token HttpOnly cookie so the browser
            // doesn't need to manually inject an Authorization header.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = ctx =>
                {
                    if (string.IsNullOrEmpty(ctx.Token))
                        ctx.Token = ctx.Request.Cookies["auth_token"];
                    return Task.CompletedTask;
                }
            };
        });
}
else
{
    // No Cognito configured — add a no-op auth scheme so [Authorize] doesn't crash
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer();
}

// ── Application Services ───────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IS3Service, S3Service>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IInvoicePdfService, InvoicePdfService>();


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

app.Run();
