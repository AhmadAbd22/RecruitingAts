using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Api.Services;

public class RequisitionScopeService(AppDbContext db) : IRequisitionScopeService
{
    public async Task<Guid?> GetEmployeeIdAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return null;
        }

        return await db.Employees
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .Select(e => (Guid?)e.EmployeeId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public bool CanViewAll(ClaimsPrincipal user) =>
        user.HasClaim(Permissions.ClaimType, Permissions.RequisitionsViewAll);

    public IQueryable<Requisition> Scope(IQueryable<Requisition> query, ClaimsPrincipal user, Guid? employeeId)
    {
        if (CanViewAll(user))
        {
            return query;
        }

        if (employeeId is null)
        {
            return query.Where(_ => false);
        }

        return query.Where(r => r.TeamMembers.Any(t => t.EmployeeId == employeeId));
    }

    public async Task<bool> CanAccessAsync(
        Guid requisitionId,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (CanViewAll(user))
        {
            return await db.Requisitions.AnyAsync(r => r.RequisitionId == requisitionId, cancellationToken);
        }

        var employeeId = await GetEmployeeIdAsync(user, cancellationToken);
        if (employeeId is null)
        {
            return false;
        }

        return await db.RequisitionTeamMembers.AnyAsync(
            t => t.RequisitionId == requisitionId && t.EmployeeId == employeeId,
            cancellationToken);
    }
}
