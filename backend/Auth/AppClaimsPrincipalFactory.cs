using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using RecruitingAts.Api.Data;

namespace RecruitingAts.Api.Auth;

/// <summary>
/// Copies permission claims from the user's roles onto the cookie principal
/// so <c>[Authorize(Policy = "...")]</c> works after login.
/// </summary>
public class AppClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole>
{
    private readonly RoleManager<IdentityRole> _roleManager;

    public AppClaimsPrincipalFactory(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IOptions<IdentityOptions> options)
        : base(userManager, roleManager, options)
    {
        _roleManager = roleManager;
    }

    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        var roleNames = await UserManager.GetRolesAsync(user);

        foreach (var roleName in roleNames)
        {
            var role = await _roleManager.FindByNameAsync(roleName);
            if (role is null)
            {
                continue;
            }

            var roleClaims = await _roleManager.GetClaimsAsync(role);
            foreach (var claim in roleClaims)
            {
                if (!identity.HasClaim(claim.Type, claim.Value))
                {
                    identity.AddClaim(claim);
                }
            }
        }

        return identity;
    }
}
