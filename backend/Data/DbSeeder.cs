using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Api.Data;

public static class DbSeeder
{
    private static readonly Dictionary<string, string[]> RolePermissions = new()
    {
        [AppRoles.Admin] =
        [
            Permissions.RequisitionsViewAll,
            Permissions.RequisitionsManage,
            Permissions.RequisitionsApprove,
            Permissions.CompensationView,
            Permissions.CompensationEdit,
            Permissions.PoolView,
            Permissions.CandidatesManage,
            Permissions.ApplicationsManage,
            Permissions.InterviewsSchedule,
            Permissions.InterviewsFeedbackAdd,
            Permissions.StagesManage,
            Permissions.UsersManage
        ],
        [AppRoles.Recruiter] =
        [
            Permissions.RequisitionsManage,
            Permissions.PoolView,
            Permissions.CandidatesManage,
            Permissions.ApplicationsManage,
            Permissions.InterviewsSchedule,
            Permissions.InterviewsFeedbackAdd
        ],
        [AppRoles.HiringManager] =
        [
            Permissions.RequisitionsManage,
            Permissions.CandidatesManage,
            Permissions.ApplicationsManage,
            Permissions.InterviewsSchedule
        ],
        [AppRoles.Interviewer] =
        [
            Permissions.InterviewsFeedbackAdd
        ]
    };

    private static readonly (string Email, string FullName, string Password, string Role, string Department)[] DemoUsers =
    [
        ("admin@demo.local", "Demo Admin", "Pass123!", AppRoles.Admin, "HR"),
        ("recruiter@demo.local", "Demo Recruiter", "Pass123!", AppRoles.Recruiter, "Talent Acquisition"),
        ("manager@demo.local", "Demo Hiring Manager", "Pass123!", AppRoles.HiringManager, "Engineering"),
        ("interviewer@demo.local", "Demo Interviewer", "Pass123!", AppRoles.Interviewer, "Engineering")
    ];

    private static readonly (string Name, int SortOrder, bool IsReserved, bool IsTerminal)[] PipelineStages =
    [
        ("Applied", 1, true, false),
        ("Screening", 2, false, false),
        ("Interview", 3, false, false),
        ("Offer", 4, false, false),
        ("Hired", 100, true, true),
        ("Disqualified", 101, true, true),
        ("NFA", 102, true, true)
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        var db = sp.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        await SeedRolesAndPermissionsAsync(roleManager);
        await SeedDemoUsersAndEmployeesAsync(userManager, db);
        await SeedPipelineStagesAsync(db);
    }

    private static async Task SeedRolesAndPermissionsAsync(RoleManager<IdentityRole> roleManager)
    {
        foreach (var roleName in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }

            var role = await roleManager.FindByNameAsync(roleName)
                       ?? throw new InvalidOperationException($"Role '{roleName}' missing after create.");

            var desired = RolePermissions[roleName].ToHashSet(StringComparer.Ordinal);
            var existingClaims = (await roleManager.GetClaimsAsync(role))
                .Where(c => c.Type == Permissions.ClaimType)
                .ToList();

            foreach (var claim in existingClaims.Where(c => !desired.Contains(c.Value)))
            {
                await roleManager.RemoveClaimAsync(role, claim);
            }

            var existingPermissions = existingClaims
                .Select(c => c.Value)
                .ToHashSet(StringComparer.Ordinal);

            foreach (var permission in desired.Where(p => !existingPermissions.Contains(p)))
            {
                await roleManager.AddClaimAsync(role, new Claim(Permissions.ClaimType, permission));
            }
        }
    }

    private static async Task SeedDemoUsersAndEmployeesAsync(
        UserManager<ApplicationUser> userManager,
        AppDbContext db)
    {
        foreach (var (email, fullName, password, role, department) in DemoUsers)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    FullName = fullName
                };

                var create = await userManager.CreateAsync(user, password);
                if (!create.Succeeded)
                {
                    var errors = string.Join("; ", create.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to seed user {email}: {errors}");
                }
            }

            if (!await userManager.IsInRoleAsync(user, role))
            {
                await userManager.AddToRoleAsync(user, role);
            }

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == user.Id);
            if (employee is null)
            {
                employee = await db.Employees.FirstOrDefaultAsync(e => e.Email == email);
            }

            if (employee is null)
            {
                db.Employees.Add(new Employee
                {
                    EmployeeId = Guid.NewGuid(),
                    UserId = user.Id,
                    FullName = fullName,
                    Email = email,
                    Department = department,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                employee.UserId = user.Id;
                employee.FullName = fullName;
                employee.Email = email;
                employee.Department = department;
                employee.IsActive = true;
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedPipelineStagesAsync(AppDbContext db)
    {
        foreach (var (name, sortOrder, isReserved, isTerminal) in PipelineStages)
        {
            var stage = await db.PipelineStages.FirstOrDefaultAsync(s => s.Name == name);
            if (stage is null)
            {
                db.PipelineStages.Add(new PipelineStage
                {
                    PipelineStageId = Guid.NewGuid(),
                    Name = name,
                    SortOrder = sortOrder,
                    IsReserved = isReserved,
                    IsTerminal = isTerminal,
                    IsActive = true
                });
            }
            else
            {
                stage.SortOrder = sortOrder;
                stage.IsReserved = isReserved;
                stage.IsTerminal = isTerminal;
                stage.IsActive = true;
            }
        }

        await db.SaveChangesAsync();
    }
}
