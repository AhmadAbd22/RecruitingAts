namespace RecruitingAts.Api.Data.Entities;

public class Requisition
{
    public Guid RequisitionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = string.Empty;
    public string Seniority { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public int Openings { get; set; } = 1;
    public string Status { get; set; } = "Draft";
    public Guid HiringManagerEmployeeId { get; set; }
    public decimal? BudgetMin { get; set; }
    public decimal? BudgetMax { get; set; }
    public string? StatusReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee HiringManager { get; set; } = null!;
    public ICollection<RequisitionTeamMember> TeamMembers { get; set; } = new List<RequisitionTeamMember>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
}
