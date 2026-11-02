using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Api.Services;

public class PipelineStageService(AppDbContext db, IAuditService audit)
{
    public async Task<List<StageAdminItem>> ListAsync(CancellationToken cancellationToken = default) =>
        await db.PipelineStages.AsNoTracking()
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new StageAdminItem(s.PipelineStageId, s.Name, s.SortOrder,
                s.IsReserved, s.IsTerminal, s.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<(PipelineStage? Stage, string? Error)> SaveAsync(
        Guid? id, SaveStageRequest request, ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0 || name.Length > 100)
            return (null, "Enter a stage name of 1 to 100 characters.");

        if (request.SortOrder < 2 || request.SortOrder > 99)
            return (null, "Working stages must have an order from 2 to 99.");

        PipelineStage? stage = null;
        if (id.HasValue)
        {
            stage = await db.PipelineStages.FindAsync([id.Value], cancellationToken);
            if (stage is null) return (null, "Stage not found.");
            if (stage.IsReserved) return (null, "Reserved stages cannot be changed.");
        }

        var reservedNames = new[] { PipelineStageNames.Applied, PipelineStageNames.Hired,
            PipelineStageNames.Disqualified, PipelineStageNames.Nfa };
        if (reservedNames.Contains(name, StringComparer.OrdinalIgnoreCase))
            return (null, "This name belongs to a reserved stage.");

        if (await db.PipelineStages.AnyAsync(
            s => s.PipelineStageId != id && s.Name.ToLower() == name.ToLower(), cancellationToken))
            return (null, "A stage with this name already exists.");

        var creating = stage is null;
        if (creating)
        {
            stage = new PipelineStage { PipelineStageId = Guid.NewGuid() };
            db.PipelineStages.Add(stage);
        }

        stage!.Name = name;
        stage.SortOrder = request.SortOrder;
        // The changed stage and its audit record are saved together.
        try
        {
            await audit.LogAsync(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty,
                creating ? "PipelineStageCreated" : "PipelineStageUpdated", nameof(PipelineStage),
                stage.PipelineStageId.ToString(), $"{name}; order {request.SortOrder}", cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql
            && (sql.Number == 2601 || sql.Number == 2627))
        {
            return (null, "A stage with this name already exists.");
        }
        return (stage, null);
    }

    public async Task<string?> DeleteAsync(
        Guid id, ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var stage = await db.PipelineStages.FindAsync([id], cancellationToken);
        if (stage is null) return "Stage not found.";
        if (stage.IsReserved) return "Reserved stages cannot be deleted.";
        if (await db.Applications.AnyAsync(a => a.PipelineStageId == id, cancellationToken))
            return "This stage contains applications. Move them to another stage before deleting it.";

        db.PipelineStages.Remove(stage);
        try
        {
            await audit.LogAsync(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty,
                "PipelineStageDeleted", nameof(PipelineStage), id.ToString(), stage.Name, cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number == 547)
        {
            return "This stage contains applications. Move them to another stage before deleting it.";
        }
        return null;
    }
}

public record SaveStageRequest([Required, StringLength(100)] string Name, [Range(2, 99)] int SortOrder);
public record StageAdminItem(Guid PipelineStageId, string Name, int SortOrder,
    bool IsReserved, bool Terminal, bool IsActive);
