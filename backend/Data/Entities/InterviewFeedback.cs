namespace RecruitingAts.Api.Data.Entities;

public class InterviewFeedback
{
    public Guid InterviewFeedbackId { get; set; }
    public Guid InterviewId { get; set; }
    public Guid InterviewerEmployeeId { get; set; }
    public int Rating { get; set; }
    public string Strengths { get; set; } = string.Empty;
    public string Concerns { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public Interview Interview { get; set; } = null!;
    public Employee Interviewer { get; set; } = null!;
}
