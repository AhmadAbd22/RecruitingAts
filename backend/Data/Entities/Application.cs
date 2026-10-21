namespace RecruitingAts.Api.Data.Entities;

public class Application
{
    public Guid ApplicationId { get; set; }
    public Guid CandidateId { get; set; }
    public Guid RequisitionId { get; set; }
    public Guid PipelineStageId { get; set; }
    public string? Source { get; set; }
    public string? DispositionReason { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Candidate Candidate { get; set; } = null!;
    public Requisition Requisition { get; set; } = null!;
    public PipelineStage PipelineStage { get; set; } = null!;
    public ICollection<Interview> Interviews { get; set; } = new List<Interview>();
}
