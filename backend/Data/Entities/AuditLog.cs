using RecruitingAts.Api.Data;

namespace RecruitingAts.Api.Data.Entities;

public class AuditLog
{
    public Guid AuditLogId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
}
