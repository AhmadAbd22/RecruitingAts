using System.Text.Json.Serialization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Services;
using RecruitingAts.Api.Storage;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // Added to prevent object cycle serialization errors
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddOpenApi();

builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var provider = builder.Configuration["Database:Provider"];
var hasSqliteConnection =
    !string.IsNullOrWhiteSpace(connectionString)
    && connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase);
var useSqlite =
    string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase) || hasSqliteConnection;

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (useSqlite)
    {
        // Fall back when Docker/env truncates an unquoted "Data Source=..." value.
        var sqlite = hasSqliteConnection
            ? connectionString!
            : "Data Source=App_Data/recruitingats.db";
        var dataSource = sqlite
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault(part => part.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase));
        if (dataSource is not null)
        {
            var path = dataSource["Data Source=".Length..].Trim().Trim('"');
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }

        options.UseSqlite(sqlite);
    }
    else
    {
        options.UseSqlServer(connectionString);
    }
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
builder.Services.AddScoped<PipelineStageService>();

builder.Services.AddScoped<InterviewService>();

var app = builder.Build();

app.UseForwardedHeaders();

await DbSeeder.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendDev");

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("index.html");
}

app.Run();

public partial class Program;
