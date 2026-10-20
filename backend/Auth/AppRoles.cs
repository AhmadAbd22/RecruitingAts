namespace RecruitingAts.Api.Auth;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Recruiter = "Recruiter";
    public const string HiringManager = "HiringManager";
    public const string Interviewer = "Interviewer";

    public static IReadOnlyList<string> All { get; } =
    [
        Admin,
        Recruiter,
        HiringManager,
        Interviewer
    ];
}
