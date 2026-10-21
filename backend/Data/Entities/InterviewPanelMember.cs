namespace RecruitingAts.Api.Data.Entities;

public class InterviewPanelMember
{
    public Guid InterviewPanelMemberId { get; set; }
    public Guid InterviewId { get; set; }
    public Guid EmployeeId { get; set; }
    public bool IsLead { get; set; }

    public Interview Interview { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}
