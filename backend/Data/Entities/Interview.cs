namespace RecruitingAts.Api.Data.Entities;

public class Interview
{
    public Guid InterviewId { get; set; }
    public Guid ApplicationId { get; set; }
    public string InterviewType { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }

    /// <summary>Scheduled | Completed | NoShow</summary>
    public string Status { get; set; } = "Scheduled";

    public string? CalendarEmailLog { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Application Application { get; set; } = null!;
    public ICollection<InterviewPanelMember> PanelMembers { get; set; } = new List<InterviewPanelMember>();
    public ICollection<InterviewFeedback> Feedbacks { get; set; } = new List<InterviewFeedback>();
}
