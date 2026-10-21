namespace RecruitingAts.Api.Data.Entities;

public class RequisitionTeamMember
{
    public Guid RequisitionTeamMemberId { get; set; }
    public Guid RequisitionId { get; set; }
    public Guid EmployeeId { get; set; }

    /// <summary>Owner | Recruiter | TechnicalInterviewer | FinalInterviewer</summary>
    public string TeamRole { get; set; } = string.Empty;

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Requisition Requisition { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}
