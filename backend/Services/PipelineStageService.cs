using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Api.Services;

public class PipelineStageService(AppDbContext db)
{
    private static readonly HashSet<string> ReservedNames = new(StringComparer.OrdinalIgnoreCase)
    {
        PipelineStageNames.Applied,
        PipelineStageNames.Hired,
        PipelineStageNames.Disqualified,
        PipelineStageNames.Nfa
    };

    public async Task<IReadOnlyList<PipelineStageAdminDto>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        return await db.PipelineStages
            .AsNoTracking()
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .Select(s => new PipelineStageAdminDto(
                s.PipelineStageId,
                s.Name,
                s.SortOrder,
                s.IsReserved,
                s.IsTerminal,
                s.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<(PipelineStageAdminDto? Stage, string? Error)> CreateWorkingAsync(
        string name,
        int sortOrder,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return (null, "Stage name is required.");
        }

        var trimmed = name.Trim();
        if (ReservedNames.Contains(trimmed))
        {
            return (null, "That name is reserved and cannot be used for a working stage.");
        }

        var exists = await db.PipelineStages.AnyAsync(
            s => s.Name == trimmed,
            cancellationToken);
        if (exists)
        {
            return (null, "A stage with that name already exists.");
        }

        var stage = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = trimmed,
            SortOrder = sortOrder,
            IsReserved = false,
            IsTerminal = false,
            IsActive = true
        };

        db.PipelineStages.Add(stage);
        await db.SaveChangesAsync(cancellationToken);

        return (ToDto(stage), null);
    }

    public async Task<(PipelineStageAdminDto? Stage, string? Error)> RenameAsync(
        Guid id,
        string name,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return (null, "Stage name is required.");
        }

        var stage = await db.PipelineStages.FirstOrDefaultAsync(
            s => s.PipelineStageId == id,
            cancellationToken);
        if (stage is null)
        {
            return (null, "Stage not found.");
        }

        if (stage.IsReserved)
        {
            return (null, "Reserved stages cannot be renamed.");
        }

        var trimmed = name.Trim();
        if (ReservedNames.Contains(trimmed))
        {
            return (null, "That name is reserved and cannot be used for a working stage.");
        }

        var clash = await db.PipelineStages.AnyAsync(
            s => s.PipelineStageId != id && s.Name == trimmed,
            cancellationToken);
        if (clash)
        {
            return (null, "A stage with that name already exists.");
        }

        stage.Name = trimmed;
        await db.SaveChangesAsync(cancellationToken);
        return (ToDto(stage), null);
    }

    public async Task<(PipelineStageAdminDto? Stage, string? Error)> SetActiveAsync(
        Guid id,
        bool isActive,
        CancellationToken cancellationToken = default)
    {
        var stage = await db.PipelineStages.FirstOrDefaultAsync(
            s => s.PipelineStageId == id,
            cancellationToken);
        if (stage is null)
        {
            return (null, "Stage not found.");
        }

        if (stage.IsReserved)
        {
            return (null, "Reserved stages cannot be deactivated.");
        }

        stage.IsActive = isActive;
        await db.SaveChangesAsync(cancellationToken);
        return (ToDto(stage), null);
    }

    private static PipelineStageAdminDto ToDto(PipelineStage stage) =>
        new(
            stage.PipelineStageId,
            stage.Name,
            stage.SortOrder,
            stage.IsReserved,
            stage.IsTerminal,
            stage.IsActive);
}

public record PipelineStageAdminDto(
    Guid PipelineStageId,
    string Name,
    int SortOrder,
    bool IsReserved,
    bool IsTerminal,
    bool IsActive);
