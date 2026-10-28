
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using System.Security.Claims;

namespace RecruitingAts.Api.Services
{
    public class ApplicationService(AppDbContext db, IRequisitionScopeService requisitionScope)
    {
        public async Task<ApplicationCreateResult> CreateAsync(
            CreateApplicationRequest request,
            ClaimsPrincipal user,
            CancellationToken cancellationToken = default)
        {
            var candidateExists = await db.Candidates
                .AnyAsync(
                    c => c.CandidateId == request.CandidateId,
                    cancellationToken);

            if (!candidateExists)
                return new(ApplicationCreateStatus.CandidateNotFound);

            var requisition = await db.Requisitions
                .FirstOrDefaultAsync(
                    r => r.RequisitionId == request.RequisitionId,
                    cancellationToken);

            if (requisition is null)
                return new(ApplicationCreateStatus.RequisitionNotFound);

            var canAccess = await requisitionScope.CanAccessAsync(
    request.RequisitionId,
    user,
    cancellationToken);

            if (!canAccess)
                return new(ApplicationCreateStatus.Forbidden);

            //Can be Deliberatly Comment

            if (requisition.Status != RequisitionStatuses.Published)
                return new(ApplicationCreateStatus.RequisitionNotPublished);

            var applicationExists = await db.Applications
                .AnyAsync(
                    a => a.CandidateId == request.CandidateId &&
                         a.RequisitionId == request.RequisitionId,
                    cancellationToken);

            if (applicationExists)
                return new(ApplicationCreateStatus.DuplicateApplication);

            var appliedStage = await db.PipelineStages
                .FirstOrDefaultAsync(
                    s => s.Name == PipelineStageNames.Applied,
                    cancellationToken);

            if (appliedStage is null)
                return new(ApplicationCreateStatus.AppliedStageNotFound);

            var application = new Application
            {
                CandidateId = request.CandidateId,
                RequisitionId = request.RequisitionId,
                PipelineStageId = appliedStage.PipelineStageId,
                Source = request.Source
            };

            db.Applications.Add(application);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is SqlException sqlException &&
                      (sqlException.Number == 2601 ||
                       sqlException.Number == 2627))
            {
                db.Entry(application).State = EntityState.Detached;
                return new(ApplicationCreateStatus.DuplicateApplication);
            }

            return new(
    ApplicationCreateStatus.Success,
    application);
        }


        public async Task<ApplicationStageUpdateResult> UpdateStageAsync(
            Guid applicationId,
            UpdateApplicationStageRequest request,
            ClaimsPrincipal user,
            CancellationToken cancellationToken = default)
        {
            var application = await db.Applications
                .FirstOrDefaultAsync(
                    a => a.ApplicationId == applicationId,
                    cancellationToken);

            if (application is null)
                return new(ApplicationStageUpdateStatus.ApplicationNotFound);

            var canAccess = await requisitionScope.CanAccessAsync(
                application.RequisitionId,
                user,
                cancellationToken);

            if (!canAccess)
                return new(ApplicationStageUpdateStatus.Forbidden);

            var currentStage = await db.PipelineStages
                .FirstOrDefaultAsync(
                    s => s.PipelineStageId == application.PipelineStageId,
                    cancellationToken);

            if (currentStage is null)
                return new(ApplicationStageUpdateStatus.StageNotFound);

            // NEW: Don't allow ordinary changes out of terminal stages.
            if (currentStage.IsTerminal)
                return new(ApplicationStageUpdateStatus.TerminalStageCannotBeChanged);

            var stage = await db.PipelineStages
                .FirstOrDefaultAsync(
                    s => s.PipelineStageId == request.PipelineStageId &&
                         s.IsActive,
                    cancellationToken);

            if (stage is null)
                return new(ApplicationStageUpdateStatus.StageNotFound);

            if (stage.Name == PipelineStageNames.Disqualified ||
                stage.Name == PipelineStageNames.Nfa)
            {
                if (string.IsNullOrWhiteSpace(request.DispositionReason))
                    return new(ApplicationStageUpdateStatus.DispositionReasonRequired);
            }

            application.PipelineStageId = stage.PipelineStageId;

            if (stage.Name == PipelineStageNames.Disqualified ||
                stage.Name == PipelineStageNames.Nfa)
            {
                application.DispositionReason = request.DispositionReason;
            }
            else
            {
                application.DispositionReason = null;
            }

            application.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            return new(ApplicationStageUpdateStatus.Success);
        }


        public async Task<List<ApplicationPipelineItemDto>> GetPipelineAsync(
    ClaimsPrincipal user,
    CancellationToken cancellationToken = default)
        {
            var employeeId = await requisitionScope.GetEmployeeIdAsync(
                user, cancellationToken);

            var scopedRequisitions = requisitionScope.Scope(
                db.Requisitions.AsNoTracking(),
                user,
                employeeId);

            return await db.Applications
                .AsNoTracking()
                .Where(a => scopedRequisitions.Any(
                    r => r.RequisitionId == a.RequisitionId))
                .Select(a => new ApplicationPipelineItemDto(
                    a.ApplicationId,
                    a.CandidateId,
                    a.RequisitionId,
                    a.Requisition.Title,
                    a.PipelineStageId,
                    a.PipelineStage.Name,
                    a.Source,
                    a.CreatedAt))
                .ToListAsync(cancellationToken);
        }

        public async Task<List<ApplicationPipelineStageDto>> GetPipelineStagesAsync(
            CancellationToken cancellationToken = default)
        {
            return await db.PipelineStages
                .AsNoTracking()
                .Where(stage => stage.IsActive)
                .OrderBy(stage => stage.SortOrder)
                .Select(stage => new ApplicationPipelineStageDto(
                    stage.PipelineStageId,
                    stage.Name,
                    stage.SortOrder))
                .ToListAsync(cancellationToken);
        }
    }

    public record ApplicationPipelineItemDto(
    Guid ApplicationId,
    Guid CandidateId,
    Guid RequisitionId,
    string RequisitionTitle,
    Guid PipelineStageId,
    string StageName,
    string? Source,
    DateTime CreatedAt);
    public record ApplicationPipelineStageDto(
        Guid PipelineStageId,
        string Name,
        int SortOrder);
    public record UpdateApplicationStageRequest(
        Guid PipelineStageId,
        string? DispositionReason
    );

    public record CreateApplicationRequest(
        Guid CandidateId,
        Guid RequisitionId,
        string? Source
    );
}


public enum ApplicationStageUpdateStatus
{
    Success,
    ApplicationNotFound,
    Forbidden,
    StageNotFound,
    DispositionReasonRequired,
    TerminalStageCannotBeChanged
}

public record ApplicationStageUpdateResult(
    ApplicationStageUpdateStatus Status);


public enum ApplicationCreateStatus
{
    Success,
    CandidateNotFound,
    RequisitionNotFound,
    Forbidden,
    RequisitionNotPublished,
    DuplicateApplication,
    AppliedStageNotFound
}

public record ApplicationCreateResult(
    ApplicationCreateStatus Status,
    Application? Application = null);
