using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;

namespace RecruitingAts.Api.Services;

public class CompensationAuditService(AppDbContext db, IRequisitionScopeService scope)
{
    public async Task<List<CompensationAuditItem>> ListAsync(
        ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var employeeId = await scope.GetEmployeeIdAsync(user, cancellationToken);
        var requisitions = scope.Scope(db.Requisitions.AsNoTracking(), user, employeeId);
        return await (
            from entry in db.AuditLogs.AsNoTracking()
            join requisition in requisitions on entry.EntityId equals requisition.RequisitionId.ToString()
            where entry.EntityType == "Requisition"
                && (entry.Action == "CompensationViewed" || entry.Action == "CompensationEdited")
            orderby entry.Timestamp descending
            select new CompensationAuditItem(
                entry.AuditLogId, entry.Timestamp,
                entry.User != null ? entry.User.FullName : "Unknown user",
                entry.Action, requisition.Title, entry.Details))
            .Take(100).ToListAsync(cancellationToken);
    }
}

public record CompensationAuditItem(Guid Id, DateTime Timestamp, string Actor,
    string Action, string RequisitionTitle, string? Details);
