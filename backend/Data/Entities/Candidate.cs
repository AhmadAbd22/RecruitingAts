namespace RecruitingAts.Api.Data.Entities;

public class Candidate
{
    public Guid CandidateId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Skills { get; set; }
    public string? ResumePath { get; set; }
    public string? Source { get; set; }
    public DateTime? ConsentDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Application> Applications { get; set; } = new List<Application>();
}
