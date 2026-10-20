using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;

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
            Permissions.PoolView,
            Permissions.CandidatesManage,
            Permissions.ApplicationsManage,
            Permissions.InterviewsSchedule
        ],
        [AppRoles.Interviewer] =
        [
            Permissions.InterviewsFeedbackAdd
        ]
    };

    private static readonly (string Email, string FullName, string Password, string Role)[] DemoUsers =
    [
        ("admin@demo.local", "Demo Admin", "Pass123!", AppRoles.Admin),
        ("recruiter@demo.local", "Demo Recruiter", "Pass123!", AppRoles.Recruiter),
        ("manager@demo.local", "Demo Hiring Manager", "Pass123!", AppRoles.HiringManager),
        ("interviewer@demo.local", "Demo Interviewer", "Pass123!", AppRoles.Interviewer)
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        var db = sp.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var roleName in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }

            var role = await roleManager.FindByNameAsync(roleName)
                       ?? throw new InvalidOperationException($"Role '{roleName}' missing after create.");

            var desired = RolePermissions[roleName];
            var existing = await roleManager.GetClaimsAsync(role);
            var existingPermissions = existing
                .Where(c => c.Type == Permissions.ClaimType)
                .Select(c => c.Value)
                .ToHashSet(StringComparer.Ordinal);

            foreach (var permission in desired)
            {
                if (existingPermissions.Contains(permission))
                {
                    continue;
                }

                await roleManager.AddClaimAsync(role, new Claim(Permissions.ClaimType, permission));
            }
        }

        foreach (var (email, fullName, password, role) in DemoUsers)
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
        }
    }
}
