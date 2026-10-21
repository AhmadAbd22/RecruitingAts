using System.Security.Claims;
using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Api.Services;

public interface IRequisitionScopeService
{
    Task<Guid?> GetEmployeeIdAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default);
    bool CanViewAll(ClaimsPrincipal user);
    IQueryable<Requisition> Scope(IQueryable<Requisition> query, ClaimsPrincipal user, Guid? employeeId);
    Task<bool> CanAccessAsync(Guid requisitionId, ClaimsPrincipal user, CancellationToken cancellationToken = default);
}
