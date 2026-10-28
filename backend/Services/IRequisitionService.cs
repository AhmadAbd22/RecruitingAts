using System.Security.Claims;

namespace RecruitingAts.Api.Services;

public interface IRequisitionService
{
    Task<IReadOnlyList<RequisitionListItem>> ListAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<RequisitionDetail?> GetAsync(Guid id, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> CreateAsync(CreateRequisitionRequest request, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> SubmitForApprovalAsync(Guid id, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> ApproveAsync(Guid id, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> PublishAsync(Guid id, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> RejectAsync(Guid id, string reason, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> ChangeStatusAsync(Guid id, string newStatus, string? reason, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> UpdateBudgetAsync(Guid id, decimal? budgetMin, decimal? budgetMax, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(RequisitionDetail? Detail, string? Error)> AddTeamMemberAsync(Guid id, Guid employeeId, string teamRole, ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<(bool Ok, string? Error)> RemoveTeamMemberAsync(Guid id, Guid teamMemberId, ClaimsPrincipal user, CancellationToken cancellationToken = default);
}