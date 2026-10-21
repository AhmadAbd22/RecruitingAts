namespace RecruitingAts.Api.Services;

public interface IAuditService
{
    Task LogAsync(
        string userId,
        string action,
        string entityType,
        string entityId,
        string? details = null,
        CancellationToken cancellationToken = default);
}
