namespace RecruitingAts.Api.Data.Entities;

public class PipelineStage
{
    public Guid PipelineStageId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsReserved { get; set; }
    public bool IsTerminal { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Application> Applications { get; set; } = new List<Application>();
}
