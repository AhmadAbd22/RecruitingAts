namespace RecruitingAts.Api.Auth;

/// <summary>
/// Permission claim values used by authorization policies.
/// Keep names stable — they are stored as role claims in the database.
/// </summary>
public static class Permissions
{
    public const string ClaimType = "permission";

    public const string RequisitionsViewAll = "REQUISITIONS.ALL_REQS.VIEW";
    public const string RequisitionsManage = "REQUISITIONS.MANAGE";
    public const string RequisitionsApprove = "REQUISITIONS.APPROVE";

    public const string CompensationView = "ATS.COMPENSATION.VIEW";
    public const string CompensationEdit = "ATS.COMPENSATION.EDIT";

    public const string PoolView = "POOL.VIEW";
    public const string CandidatesManage = "CANDIDATES.MANAGE";

    public const string ApplicationsManage = "APPLICATIONS.MANAGE";

    public const string InterviewsSchedule = "INTERVIEWS.SCHEDULE";
    public const string InterviewsFeedbackAdd = "INTERVIEWS.FEEDBACK.ADD";

    public const string StagesManage = "STAGES.MANAGE";
    public const string UsersManage = "USERS.MANAGE";

    public static IReadOnlyList<string> All { get; } =
    [
        RequisitionsViewAll,
        RequisitionsManage,
        RequisitionsApprove,
        CompensationView,
        CompensationEdit,
        PoolView,
        CandidatesManage,
        ApplicationsManage,
        InterviewsSchedule,
        InterviewsFeedbackAdd,
        StagesManage,
        UsersManage
    ];
}
