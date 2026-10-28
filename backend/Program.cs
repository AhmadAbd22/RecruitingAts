using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Services;
using RecruitingAts.Api.Storage;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // Added to prevent object cycle serialization errors
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddOpenApi();

builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));

        options.EnableSensitiveDataLogging(false);
    });

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 6;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, AppClaimsPrincipalFactory>();
builder.Services.AddAppAuthorization();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "RecruitingAts.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);

    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IRequisitionScopeService, RequisitionScopeService>();

// Updated to register the interface alongside the service implementation:
builder.Services.AddScoped<IRequisitionService, RequisitionService>();

builder.Services.AddScoped<CandidateService>();
builder.Services.AddScoped<ApplicationService>();

var app = builder.Build();

app.Use(async (context, next) =>
{
    bool isCandidateRequest =
        context.Request.Path.StartsWithSegments("/api/candidates");

    if (!isCandidateRequest)
    {
        await next();
        return;
    }

    try
    {
        await next();
    }
    catch (Exception error)
    {
        if (context.RequestAborted.IsCancellationRequested)
        {
            context.Abort();
            return;
        }

        app.Logger.LogError(
            "Candidate request failed. Type: {ErrorType}. Trace ID: {TraceId}",
            error.GetType().Name,
            context.TraceIdentifier);

        if (context.Response.HasStarted)
        {
            context.Abort();
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = 500;
        context.Response.Headers["Cache-Control"] = "no-store";

        await context.Response.WriteAsJsonAsync(new
        {
            message = "An unexpected error occurred.",
            traceId = context.TraceIdentifier
        });
    }
});

await DbSeeder.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendDev");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;