using Microsoft.AspNetCore.Identity;

namespace RecruitingAts.Api.Data;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
}
