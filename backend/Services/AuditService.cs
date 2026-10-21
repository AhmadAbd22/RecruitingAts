using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Api.Services;

public class AuditService(AppDbContext db) : IAuditService
{
    public async Task LogAsync(
        string userId,
        string action,
        string entityType,
        string entityId,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            AuditLogId = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            Timestamp = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
    }
}
