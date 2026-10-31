using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Api.Services;

public class RequisitionService(
    AppDbContext db,
    IRequisitionScopeService scope,
    IAuditService audit) : IRequisitionService
{
    public async Task<IReadOnlyList<RequisitionListItem>> ListAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var employeeId = await scope.GetEmployeeIdAsync(user, cancellationToken);
        var canSeeBudget = user.HasClaim(Permissions.ClaimType, Permissions.CompensationView);

        var items = await scope.Scope(db.Requisitions.AsNoTracking(), user, employeeId)
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new RequisitionListItem(
                r.RequisitionId,
                r.Title,
                r.Department,
                r.Status,
                r.Openings,
                canSeeBudget ? r.BudgetMin : null,
                canSeeBudget ? r.BudgetMax : null))
            .ToListAsync(cancellationToken);

        return items;
    }

    public async Task<RequisitionDetail?> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (!await scope.CanAccessAsync(id, user, cancellationToken))
        {
            return null;
        }

        var req = await db.Requisitions.AsNoTracking()
            .Include(r => r.HiringManager)
            .Include(r => r.TeamMembers).ThenInclude(t => t.Employee)
            .FirstOrDefaultAsync(r => r.RequisitionId == id, cancellationToken);

        if (req is null)
        {
            return null;
        }

        var canSeeBudget = user.HasClaim(Permissions.ClaimType, Permissions.CompensationView);
        if (canSeeBudget && (req.BudgetMin.HasValue || req.BudgetMax.HasValue))
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            await audit.LogAsync(
                userId,
                "CompensationViewed",
                nameof(Requisition),
                id.ToString(),
                "Viewed requisition budget",
                cancellationToken);
        }

        return ToDetail(req, canSeeBudget);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> CreateAsync(
        CreateRequisitionRequest request,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (!user.HasClaim(Permissions.ClaimType, Permissions.RequisitionsManage))
        {
            return (null, "Missing REQUISITIONS.MANAGE permission.");
        }
        if (request is null)
            return (null, "Request body is required.");

        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Department) ||
            string.IsNullOrWhiteSpace(request.EmploymentType) ||
            string.IsNullOrWhiteSpace(request.Seniority) ||
            string.IsNullOrWhiteSpace(request.Skills) ||
            string.IsNullOrWhiteSpace(request.JobDescription))
        {
            return (null, "All requisition fields are required.");
        }
        

        var employeeId = await scope.GetEmployeeIdAsync(user, cancellationToken);
        if (employeeId is null)
        {
            return (null, "Current user has no Employee record.");
        }

        var demoHiringManager = await db.Employees
            .FirstOrDefaultAsync(e => e.Email == "manager@demo.local" && e.IsActive, cancellationToken);
        if (demoHiringManager is null)
        {
            return (null, "Demo hiring manager not found or inactive.");
        }

        var now = DateTime.UtcNow;
        var req = new Requisition
        {
            RequisitionId = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Department = request.Department.Trim(),
            EmploymentType = request.EmploymentType.Trim(),
            Seniority = request.Seniority.Trim(),
            Skills = request.Skills.Trim(),
            JobDescription = request.JobDescription.Trim(),
            Openings = request.Openings < 1 ? 1 : request.Openings,
            Status = RequisitionStatuses.Draft,
            HiringManagerEmployeeId = demoHiringManager.EmployeeId,
            BudgetMin = null,
            BudgetMax = null,
            CreatedAt = now,
            UpdatedAt = now,
            TeamMembers =
            [
                new RequisitionTeamMember
                {
                    RequisitionTeamMemberId = Guid.NewGuid(),
                    EmployeeId = employeeId.Value,
                    TeamRole = TeamRoles.Owner,
                    AddedAt = now
                }
            ]
        };

        db.Requisitions.Add(req);
        await db.SaveChangesAsync(cancellationToken);

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await audit.LogAsync(
            userId,
            "RequisitionCreated",
            nameof(Requisition),
            req.RequisitionId.ToString(),
            cancellationToken: cancellationToken);

        var detail = await GetAsync(req.RequisitionId, user, cancellationToken);
        return (detail, null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> SubmitForApprovalAsync(
        Guid id,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var (req, error) = await LoadForManageAsync(id, user, cancellationToken);
        if (error is not null || req is null)
        {
            return (null, error);
        }

        if (req.Status != RequisitionStatuses.Draft)
        {
            return (null, "Only Draft requisitions can be submitted for approval.");
        }

        req.Status = RequisitionStatuses.PendingApproval;
        req.StatusReason = null;
        req.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        await AuditStatusAsync(user, req, "SubmittedForApproval", cancellationToken);
        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> ApproveAsync(
        Guid id,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (!user.HasClaim(Permissions.ClaimType, Permissions.RequisitionsApprove))
        {
            return (null, "Missing REQUISITIONS.APPROVE permission.");
        }

        var req = await db.Requisitions.FirstOrDefaultAsync(r => r.RequisitionId == id, cancellationToken);
        if (req is null)
        {
            return (null, "Requisition not found.");
        }

        if (!await scope.CanAccessAsync(id, user, cancellationToken))
        {
            return (null, "Requisition not found or not in scope.");
        }

        if (req.Status != RequisitionStatuses.PendingApproval)
        {
            return (null, "Only PendingApproval requisitions can be approved.");
        }

        req.Status = RequisitionStatuses.Approved;
        req.StatusReason = null;
        req.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        await AuditStatusAsync(user, req, "Approved", cancellationToken);
        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> PublishAsync(
        Guid id,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var (req, error) = await LoadForManageAsync(id, user, cancellationToken);
        if (error is not null || req is null)
        {
            return (null, error);
        }

        if (req.Status != RequisitionStatuses.Approved)
        {
            return (null, "Only Approved requisitions can be published.");
        }

        req.Status = RequisitionStatuses.Published;
        req.StatusReason = null;
        req.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        await AuditStatusAsync(user, req, "Published", cancellationToken);
        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> RejectAsync(
        Guid id,
        string reason,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (!user.HasClaim(Permissions.ClaimType, Permissions.RequisitionsApprove))
        {
            return (null, "Missing REQUISITIONS.APPROVE permission.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            return (null, "Rejection reason is required.");
        }

        var req = await db.Requisitions.FirstOrDefaultAsync(r => r.RequisitionId == id, cancellationToken);
        if (req is null)
        {
            return (null, "Requisition not found.");
        }

        if (!await scope.CanAccessAsync(id, user, cancellationToken))
        {
            return (null, "Requisition not found or not in scope.");
        }

        if (req.Status != RequisitionStatuses.PendingApproval)
        {
            return (null, "Only PendingApproval requisitions can be rejected.");
        }

        req.Status = RequisitionStatuses.Draft;
        req.StatusReason = reason.Trim();
        req.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        await AuditStatusAsync(user, req, "Rejected", cancellationToken);
        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> ChangeStatusAsync(
        Guid id,
        string newStatus,
        string? reason,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var allowed = new HashSet<string>(StringComparer.Ordinal)
        {
            RequisitionStatuses.OnHold,
            RequisitionStatuses.Filled,
            RequisitionStatuses.Closed,
            RequisitionStatuses.Cancelled
        };

        if (!allowed.Contains(newStatus))
        {
            return (null, "Invalid status transition.");
        }

        if (newStatus != RequisitionStatuses.Filled && string.IsNullOrWhiteSpace(reason))
        {
            return (null, $"Reason is required for status {newStatus}.");
        }

        var (req, error) = await LoadForManageAsync(id, user, cancellationToken);
        if (error is not null || req is null)
        {
            return (null, error);
        }

        if (req.Status != RequisitionStatuses.Published && req.Status != RequisitionStatuses.OnHold)
        {
            return (null, "Only Published or OnHold requisitions can change to hold/fill/close/cancel.");
        }

        req.Status = newStatus;
        req.StatusReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        req.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        await AuditStatusAsync(user, req, $"Status:{newStatus}", cancellationToken);
        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> UpdateBudgetAsync(
        Guid id,
        decimal? budgetMin,
        decimal? budgetMax,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (!user.HasClaim(Permissions.ClaimType, Permissions.CompensationEdit))
        {
            return (null, "Missing ATS.COMPENSATION.EDIT permission.");
        }

        if (!await scope.CanAccessAsync(id, user, cancellationToken))
        {
            return (null, "Requisition not found or not in scope.");
        }

        var req = await db.Requisitions.FirstOrDefaultAsync(r => r.RequisitionId == id, cancellationToken);
        if (req is null)
        {
            return (null, "Requisition not found.");
        }

        req.BudgetMin = budgetMin;
        req.BudgetMax = budgetMax;
        req.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await audit.LogAsync(
            userId,
            "CompensationEdited",
            nameof(Requisition),
            id.ToString(),
            cancellationToken: cancellationToken);

        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(RequisitionDetail? Detail, string? Error)> AddTeamMemberAsync(
        Guid id,
        Guid employeeId,
        string teamRole,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        if (!TeamRoles.All.Contains(teamRole))
        {
            return (null, "Invalid team role.");
        }

        var (req, error) = await LoadForManageAsync(id, user, cancellationToken);
        if (error is not null || req is null)
        {
            return (null, error);
        }

        if (!await db.Employees.AnyAsync(e => e.EmployeeId == employeeId && e.IsActive, cancellationToken))
        {
            return (null, "Employee not found.");
        }

        if (teamRole == TeamRoles.Owner)
        {
            return (null, "Use ownership transfer later; create flow sets exactly one Owner.");
        }

        var exists = await db.RequisitionTeamMembers.AnyAsync(
            t => t.RequisitionId == id && t.EmployeeId == employeeId,
            cancellationToken);
        if (exists)
        {
            return (null, "Employee is already on the team.");
        }

        db.RequisitionTeamMembers.Add(new RequisitionTeamMember
        {
            RequisitionTeamMemberId = Guid.NewGuid(),
            RequisitionId = id,
            EmployeeId = employeeId,
            TeamRole = teamRole,
            AddedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await audit.LogAsync(
            userId,
            "TeamMemberAdded",
            nameof(Requisition),
            id.ToString(),
            $"{employeeId}:{teamRole}",
            cancellationToken);

        return (await GetAsync(id, user, cancellationToken), null);
    }

    public async Task<(bool Ok, string? Error)> RemoveTeamMemberAsync(
        Guid id,
        Guid teamMemberId,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var (req, error) = await LoadForManageAsync(id, user, cancellationToken);
        if (error is not null || req is null)
        {
            return (false, error);
        }

        var member = await db.RequisitionTeamMembers
            .FirstOrDefaultAsync(t => t.RequisitionTeamMemberId == teamMemberId && t.RequisitionId == id, cancellationToken);
        if (member is null)
        {
            return (false, "Team member not found.");
        }

        if (member.TeamRole == TeamRoles.Owner)
        {
            return (false, "Cannot remove the Owner.");
        }

        db.RequisitionTeamMembers.Remove(member);
        await db.SaveChangesAsync(cancellationToken);

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await audit.LogAsync(
            userId,
            "TeamMemberRemoved",
            nameof(Requisition),
            id.ToString(),
            teamMemberId.ToString(),
            cancellationToken);

        return (true, null);
    }

    private async Task<(Requisition? Req, string? Error)> LoadForManageAsync(
        Guid id,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        if (!user.HasClaim(Permissions.ClaimType, Permissions.RequisitionsManage)
            && !scope.CanViewAll(user))
        {
            return (null, "Missing REQUISITIONS.MANAGE permission.");
        }

        if (!await scope.CanAccessAsync(id, user, cancellationToken))
        {
            return (null, "Requisition not found or not in scope.");
        }

        var req = await db.Requisitions.FirstOrDefaultAsync(r => r.RequisitionId == id, cancellationToken);
        return req is null ? (null, "Requisition not found.") : (req, null);
    }

    private async Task AuditStatusAsync(
        ClaimsPrincipal user,
        Requisition req,
        string action,
        CancellationToken cancellationToken)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await audit.LogAsync(
            userId,
            action,
            nameof(Requisition),
            req.RequisitionId.ToString(),
            req.StatusReason,
            cancellationToken);
    }

    private static RequisitionDetail ToDetail(Requisition req, bool includeBudget) =>
        new(
            req.RequisitionId,
            req.Title,
            req.Department,
            req.EmploymentType,
            req.Seniority,
            req.Skills,
            req.JobDescription,
            req.Openings,
            req.Status,
            req.StatusReason,
            req.HiringManagerEmployeeId,
            req.HiringManager.FullName,
            includeBudget ? req.BudgetMin : null,
            includeBudget ? req.BudgetMax : null,
            req.TeamMembers
                .OrderBy(t => t.TeamRole)
                .Select(t => new TeamMemberDto(
                    t.RequisitionTeamMemberId,
                    t.EmployeeId,
                    t.Employee.FullName,
                    t.TeamRole))
                .ToList());
}

public record CreateRequisitionRequest(
    string Title,
    string Department,
    string EmploymentType,
    string Seniority,
    string Skills,
    string JobDescription,
    int Openings);

public record RequisitionListItem(
    Guid RequisitionId,
    string Title,
    string Department,
    string Status,
    int Openings,
    decimal? BudgetMin,
    decimal? BudgetMax);

public record TeamMemberDto(
    Guid RequisitionTeamMemberId,
    Guid EmployeeId,
    string EmployeeName,
    string TeamRole);

public record RequisitionDetail(
    Guid RequisitionId,
    string Title,
    string Department,
    string EmploymentType,
    string Seniority,
    string Skills,
    string JobDescription,
    int Openings,
    string Status,
    string? StatusReason,
    Guid HiringManagerEmployeeId,
    string HiringManagerName,
    decimal? BudgetMin,
    decimal? BudgetMax,
    IReadOnlyList<TeamMemberDto> Team);