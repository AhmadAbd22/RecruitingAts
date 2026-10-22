
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Api.Services
{
    public class ApplicationService(AppDbContext db)
    {
        public async Task<Application?> CreateAsync(
            CreateApplicationRequest request,
            CancellationToken cancellationToken = default)
        {
            var candidateExists = await db.Candidates
                .AnyAsync(
                    c => c.CandidateId == request.CandidateId,
                    cancellationToken);

            if (!candidateExists)
                return null;

            var requisition = await db.Requisitions
                .FirstOrDefaultAsync(
                    r => r.RequisitionId == request.RequisitionId,
                    cancellationToken);

            if (requisition is null)
                return null;

            // Restore this check to enforce FR-APP-002.
            if (requisition.Status != RequisitionStatuses.Published)
                return null;

            var applicationExists = await db.Applications
                .AnyAsync(
                    a => a.CandidateId == request.CandidateId &&
                         a.RequisitionId == request.RequisitionId,
                    cancellationToken);

            if (applicationExists)
                return null;

            var appliedStage = await db.PipelineStages
                .FirstOrDefaultAsync(
                    s => s.Name == PipelineStageNames.Applied,
                    cancellationToken);

            if (appliedStage is null)
                return null;

            var application = new Application
            {
                CandidateId = request.CandidateId,
                RequisitionId = request.RequisitionId,
                PipelineStageId = appliedStage.PipelineStageId,
                Source = request.Source
            };

            db.Applications.Add(application);
            await db.SaveChangesAsync(cancellationToken);

            return application;
        }

        public async Task<bool> UpdateStageAsync(
            Guid applicationId,
            UpdateApplicationStageRequest request,
            CancellationToken cancellationToken = default)
        {
            var application = await db.Applications
                .FirstOrDefaultAsync(
                    a => a.ApplicationId == applicationId,
                    cancellationToken);

            if (application is null)
                return false;

            var stage = await db.PipelineStages
                .FirstOrDefaultAsync(
                    s => s.PipelineStageId == request.PipelineStageId,
                    cancellationToken);

            if (stage is null)
                return false;

            if (stage.Name == PipelineStageNames.Disqualified ||
                stage.Name == PipelineStageNames.Nfa)
            {
                if (string.IsNullOrWhiteSpace(request.DispositionReason))
                    return false;
            }

            application.PipelineStageId = stage.PipelineStageId;
            application.DispositionReason = request.DispositionReason;
            application.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
    }

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
