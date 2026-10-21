using RecruitingAts.Api.Data;

namespace RecruitingAts.Api.Data.Entities;

public class Employee
{
    public Guid EmployeeId { get; set; }

    /// <summary>AspNetUsers.Id when linked to a login.</summary>
    public string? UserId { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public ICollection<Requisition> HiringManagerRequisitions { get; set; } = new List<Requisition>();
    public ICollection<RequisitionTeamMember> TeamMemberships { get; set; } = new List<RequisitionTeamMember>();
    public ICollection<InterviewPanelMember> InterviewPanelMemberships { get; set; } = new List<InterviewPanelMember>();
    public ICollection<InterviewFeedback> InterviewFeedbacks { get; set; } = new List<InterviewFeedback>();
}
