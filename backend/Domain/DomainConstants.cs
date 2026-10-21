namespace RecruitingAts.Api.Domain;

public static class RequisitionStatuses
{
    public const string Draft = "Draft";
    public const string PendingApproval = "PendingApproval";
    public const string Approved = "Approved";
    public const string Published = "Published";
    public const string OnHold = "OnHold";
    public const string Filled = "Filled";
    public const string Closed = "Closed";
    public const string Cancelled = "Cancelled";

    /// <summary>Job criteria may be edited only in these statuses (not after publish).</summary>
    public static readonly HashSet<string> Editable =
    [
        Draft,
        PendingApproval,
        Approved
    ];

    public static readonly HashSet<string> ReasonRequired =
    [
        Draft, // used when rejecting back to Draft — reason still required on reject action
        OnHold,
        Closed,
        Cancelled
    ];
}

public static class TeamRoles
{
    public const string Owner = "Owner";
    public const string Recruiter = "Recruiter";
    public const string TechnicalInterviewer = "TechnicalInterviewer";
    public const string FinalInterviewer = "FinalInterviewer";

    public static readonly HashSet<string> All =
    [
        Owner,
        Recruiter,
        TechnicalInterviewer,
        FinalInterviewer
    ];

    public static readonly HashSet<string> Interviewers =
    [
        TechnicalInterviewer,
        FinalInterviewer
    ];
}

public static class PipelineStageNames
{
    public const string Applied = "Applied";
    public const string Screening = "Screening";
    public const string Interview = "Interview";
    public const string Offer = "Offer";
    public const string Hired = "Hired";
    public const string Disqualified = "Disqualified";
    public const string Nfa = "NFA";
}
