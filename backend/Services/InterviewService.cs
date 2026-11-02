using Microsoft.Data.SqlClient;
using RecruitingAts.Api.Auth;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Api.Services;

public class InterviewService(
    AppDbContext db,
    IRequisitionScopeService scope)
{
    public async Task<InterviewCreateResult> CreateAsync(
        CreateInterviewRequest request,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        // Check the basic input.
        if (request.ApplicationId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.InterviewType)
            || string.IsNullOrWhiteSpace(request.Mode)
            || !request.ScheduledAt.HasValue)
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.Invalid,
                "Application, interview type, mode and date/time are required.");
        }

        // Find the application and the requisition it belongs to.
        var application = await db.Applications
            .AsNoTracking()
            .Where(a => a.ApplicationId == request.ApplicationId)
            .Select(a => new
            {
                a.ApplicationId,
                a.RequisitionId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (application is null)
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.NotFound,
                "Application not found.");
        }

        // Check whether this user can access that requisition.
        var canAccess = await scope.CanAccessAsync(
            application.RequisitionId,
            user,
            cancellationToken);

        if (!canAccess)
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.Forbidden,
                "You do not have access to this requisition.");
        }

        // Require a panel and reject repeated employee IDs.
        if (request.PanelEmployeeIds is null
            || request.PanelEmployeeIds.Count == 0)
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.Invalid,
                "Select at least one panel member.");
        }

        if (request.PanelEmployeeIds.Distinct().Count()
            != request.PanelEmployeeIds.Count)
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.Invalid,
                "The same employee cannot be selected twice.");
        }

        // The lead must also be one of the selected panel members.
        if (request.LeadEmployeeId.HasValue
            && !request.PanelEmployeeIds.Contains(
                request.LeadEmployeeId.Value))
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.Invalid,
                "The lead interviewer must be a selected panel member.");
        }

        // Only interviewer-team members of this requisition are eligible.
        var eligibleEmployeeIds = await db.RequisitionTeamMembers
            .AsNoTracking()
            .Where(t =>
                t.RequisitionId == application.RequisitionId
                && TeamRoles.Interviewers.Contains(t.TeamRole))
            .Select(t => t.EmployeeId)
            .ToListAsync(cancellationToken);

        var hasInvalidMember = request.PanelEmployeeIds
            .Any(id => !eligibleEmployeeIds.Contains(id));

        if (hasInvalidMember)
        {
            return new InterviewCreateResult(
                InterviewCreateStatus.Invalid,
                "Every panel member must belong to this requisition's interviewer team.");
        }

        // Create the interview linked to the existing application.
        var interview = new Interview
        {
            InterviewId = Guid.NewGuid(),
            ApplicationId = application.ApplicationId,
            InterviewType = request.InterviewType.Trim(),
            Mode = request.Mode.Trim(),
            ScheduledAt = request.ScheduledAt.Value.UtcDateTime,
            Status = "Scheduled"
        };

        foreach (var employeeId in request.PanelEmployeeIds)
        {
            interview.PanelMembers.Add(new InterviewPanelMember
            {
                InterviewPanelMemberId = Guid.NewGuid(),
                EmployeeId = employeeId,
                IsLead = request.LeadEmployeeId == employeeId
            });
        }

        db.Interviews.Add(interview);
        await db.SaveChangesAsync(cancellationToken);

        return new InterviewCreateResult(
            InterviewCreateStatus.Success,
            Interview: ToDetail(interview));
    }

    public async Task<InterviewDetail?> GetAsync(
        Guid interviewId,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var employeeId = await scope.GetEmployeeIdAsync(
            user,
            cancellationToken);

        var allowedRequisitions = scope.Scope(
            db.Requisitions.AsNoTracking(),
            user,
            employeeId);

        // Read the interview only when its requisition is in scope.
        var interview = await db.Interviews
            .AsNoTracking()
            .Where(i => i.InterviewId == interviewId)
            .Where(i => allowedRequisitions.Any(
                r => r.RequisitionId == i.Application.RequisitionId))
            .Include(i => i.PanelMembers)
            .FirstOrDefaultAsync(cancellationToken);

        return interview is null ? null : ToDetail(interview);
    }

    public async Task<IReadOnlyList<MyInterviewItem>> GetMyInterviewsAsync(
    ClaimsPrincipal user,
    CancellationToken cancellationToken = default)
    {
        var employeeId = await scope.GetEmployeeIdAsync(
            user,
            cancellationToken);

        if (!employeeId.HasValue)
        {
            return Array.Empty<MyInterviewItem>();
        }

        var allowedRequisitions = scope.Scope(
            db.Requisitions.AsNoTracking(),
            user,
            employeeId);

        return await db.Interviews
            .AsNoTracking()
            .Where(i => allowedRequisitions.Any(
                r => r.RequisitionId == i.Application.RequisitionId))
            .Where(i => i.PanelMembers.Any(
                p => p.EmployeeId == employeeId.Value))
            .OrderBy(i => i.ScheduledAt)
            .Select(i => new MyInterviewItem(
                i.InterviewId,
                i.ApplicationId,
                i.Application.Candidate.FullName,
                i.Application.Requisition.Title,
                i.InterviewType,
                i.Mode,
                i.ScheduledAt,
                i.Status,
                i.Feedbacks.Any(f =>
                    f.InterviewerEmployeeId == employeeId.Value)))
            .ToListAsync(cancellationToken);
    }

    public async Task<InterviewFeedbackResult> SubmitFeedbackAsync(
        Guid interviewId,
        SubmitInterviewFeedbackRequest request,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        // Reuse the existing interview scope check.
        var interview = await GetAsync(
            interviewId,
            user,
            cancellationToken);

        if (interview is null)
        {
            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.NotFound,
                "Interview not found or not in your scope.");
        }

        // Find the employee linked to the signed-in account.
        var employeeId = await scope.GetEmployeeIdAsync(
            user,
            cancellationToken);

        if (!employeeId.HasValue
            || !interview.Panel.Any(
                p => p.EmployeeId == employeeId.Value))
        {
            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.Forbidden,
                "Only assigned panel members can submit feedback.");
        }

        if (request.Rating < 1
            || request.Rating > 5
            || string.IsNullOrWhiteSpace(request.Strengths)
            || string.IsNullOrWhiteSpace(request.Concerns)
            || string.IsNullOrWhiteSpace(request.Recommendation)
            || request.Recommendation.Length > 500)
        {
            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.Invalid,
                "Provide a rating from 1 to 5, strengths, concerns and a recommendation of up to 500 characters.");
        }

        var alreadySubmitted = await db.InterviewFeedbacks
            .AnyAsync(
                f => f.InterviewId == interviewId
                    && f.InterviewerEmployeeId == employeeId.Value,
                cancellationToken);

        if (alreadySubmitted)
        {
            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.AlreadySubmitted,
                "You have already submitted feedback for this interview.");
        }

        var feedback = new InterviewFeedback
        {
            InterviewFeedbackId = Guid.NewGuid(),
            InterviewId = interviewId,
            InterviewerEmployeeId = employeeId.Value,
            Rating = request.Rating,
            Strengths = request.Strengths.Trim(),
            Concerns = request.Concerns.Trim(),
            Recommendation = request.Recommendation.Trim(),
            SubmittedAt = DateTime.UtcNow
        };

        db.InterviewFeedbacks.Add(feedback);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is SqlException sql
            && (sql.Number == 2601 || sql.Number == 2627))
        {
            // The database also prevents two simultaneous submissions.
            db.Entry(feedback).State = EntityState.Detached;

            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.AlreadySubmitted,
                "You have already submitted feedback for this interview.");
        }

        return new InterviewFeedbackResult(
            InterviewFeedbackStatus.Success,
            "Feedback submitted successfully.");
    }

    public async Task<InterviewFeedbackResult> GetFeedbackAsync(
        Guid interviewId,
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var interview = await GetAsync(
            interviewId,
            user,
            cancellationToken);

        if (interview is null)
        {
            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.NotFound,
                "Interview not found or not in your scope.");
        }

        var employeeId = await scope.GetEmployeeIdAsync(
            user,
            cancellationToken);

        // Panel members must submit first, including Admin or Recruiter
        // accounts that are participating as interviewers.
        if (employeeId.HasValue
            && interview.Panel.Any(
                p => p.EmployeeId == employeeId.Value))
        {
            var hasSubmitted = await db.InterviewFeedbacks
                .AnyAsync(
                    f => f.InterviewId == interviewId
                        && f.InterviewerEmployeeId == employeeId.Value,
                    cancellationToken);

            if (!hasSubmitted)
            {
                return new InterviewFeedbackResult(
                    InterviewFeedbackStatus.Forbidden,
                    "Submit your own feedback before viewing other interviewers' feedback.");
            }
        }
        else if (!scope.CanViewAll(user)
            && !user.HasClaim(
                Permissions.ClaimType,
                Permissions.InterviewsSchedule))
        {
            return new InterviewFeedbackResult(
                InterviewFeedbackStatus.Forbidden,
                "You do not have permission to review this interview's feedback.");
        }

        // Feedback content is queried only after the access checks.
        var items = await db.InterviewFeedbacks
            .AsNoTracking()
            .Where(f => f.InterviewId == interviewId)
            .OrderBy(f => f.SubmittedAt)
            .Select(f => new InterviewFeedbackItem(
                f.InterviewFeedbackId,
                f.InterviewerEmployeeId,
                f.Interviewer.FullName,
                f.Rating,
                f.Strengths,
                f.Concerns,
                f.Recommendation,
                f.SubmittedAt))
            .ToListAsync(cancellationToken);

        return new InterviewFeedbackResult(
            InterviewFeedbackStatus.Success,
            Items: items);
    }

    private static InterviewDetail ToDetail(Interview interview)
    {
        return new InterviewDetail(
            interview.InterviewId,
            interview.ApplicationId,
            interview.InterviewType,
            interview.Mode,
            interview.ScheduledAt,
            interview.Status,
            interview.PanelMembers
                .Select(p => new InterviewPanelItem(
                    p.EmployeeId,
                    p.IsLead))
                .ToList());
    }
}

public record CreateInterviewRequest(
    Guid ApplicationId,

    [Required, StringLength(100)]
    string InterviewType,

    [Required, StringLength(50)]
    string Mode,

    [Required]
    DateTimeOffset? ScheduledAt,

    [Required, MinLength(1)]
    List<Guid> PanelEmployeeIds,

    Guid? LeadEmployeeId = null);

public record InterviewPanelItem(
    Guid EmployeeId,
    bool IsLead);

public record InterviewDetail(
    Guid InterviewId,
    Guid ApplicationId,
    string InterviewType,
    string Mode,
    DateTime ScheduledAt,
    string Status,
    IReadOnlyList<InterviewPanelItem> Panel);

public enum InterviewCreateStatus
{
    Success,
    NotFound,
    Forbidden,
    Invalid
}

public record InterviewCreateResult(
    InterviewCreateStatus Status,
    string? Message = null,
    InterviewDetail? Interview = null);

public record SubmitInterviewFeedbackRequest(
    [Range(1, 5)]
    int Rating,

    [Required]
    string Strengths,

    [Required]
    string Concerns,

    [Required, StringLength(500)]
    string Recommendation);

public record MyInterviewItem(
    Guid InterviewId,
    Guid ApplicationId,
    string CandidateName,
    string RequisitionTitle,
    string InterviewType,
    string Mode,
    DateTime ScheduledAt,
    string Status,
    bool HasSubmittedFeedback);

public record InterviewFeedbackItem(
    Guid InterviewFeedbackId,
    Guid InterviewerEmployeeId,
    string InterviewerName,
    int Rating,
    string Strengths,
    string Concerns,
    string Recommendation,
    DateTime SubmittedAt);

public enum InterviewFeedbackStatus
{
    Success,
    NotFound,
    Forbidden,
    Invalid,
    AlreadySubmitted
}

public record InterviewFeedbackResult(
    InterviewFeedbackStatus Status,
    string? Message = null,
    IReadOnlyList<InterviewFeedbackItem>? Items = null);