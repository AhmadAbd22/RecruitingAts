using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-APP-005 / FR-APP-006 — stage moves and disposition reasons.
/// </summary>
public class ApplicationStageTests
{
    [Fact]
    public async Task StageMove_ToScreening_Succeeds()
    {
        var (db, service, user, appId, stages) = await CreateFixtureAsync();

        var result = await service.UpdateStageAsync(
            appId,
            new UpdateApplicationStageRequest(stages.ScreeningId, DispositionReason: null),
            user);

        Assert.Equal(ApplicationStageUpdateStatus.Success, result.Status);
        var app = await db.Applications.SingleAsync(a => a.ApplicationId == appId);
        Assert.Equal(stages.ScreeningId, app.PipelineStageId);
    }

    [Fact]
    public async Task Disposition_Disqualified_WithoutReason_Fails()
    {
        var (db, service, user, appId, stages) = await CreateFixtureAsync();

        var result = await service.UpdateStageAsync(
            appId,
            new UpdateApplicationStageRequest(stages.DisqualifiedId, DispositionReason: null),
            user);

        Assert.Equal(ApplicationStageUpdateStatus.DispositionReasonRequired, result.Status);
        var app = await db.Applications.SingleAsync(a => a.ApplicationId == appId);
        Assert.Equal(stages.AppliedId, app.PipelineStageId);
    }

    [Fact]
    public async Task Disposition_Nfa_WithoutReason_Fails()
    {
        var (db, service, user, appId, stages) = await CreateFixtureAsync();

        var result = await service.UpdateStageAsync(
            appId,
            new UpdateApplicationStageRequest(stages.NfaId, DispositionReason: "   "),
            user);

        Assert.Equal(ApplicationStageUpdateStatus.DispositionReasonRequired, result.Status);
        var app = await db.Applications.SingleAsync(a => a.ApplicationId == appId);
        Assert.Equal(stages.AppliedId, app.PipelineStageId);
    }

    [Fact]
    public async Task Disposition_WithReason_Succeeds()
    {
        var (db, service, user, appId, stages) = await CreateFixtureAsync();

        var result = await service.UpdateStageAsync(
            appId,
            new UpdateApplicationStageRequest(stages.DisqualifiedId, "Not a fit for the role"),
            user);

        Assert.Equal(ApplicationStageUpdateStatus.Success, result.Status);
        var app = await db.Applications.SingleAsync(a => a.ApplicationId == appId);
        Assert.Equal(stages.DisqualifiedId, app.PipelineStageId);
        Assert.Equal("Not a fit for the role", app.DispositionReason);
    }

    private static async Task<(
        AppDbContext Db,
        ApplicationService Service,
        ClaimsPrincipal User,
        Guid ApplicationId,
        StageIds Stages)> CreateFixtureAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);
        var stages = await SeedStagesAsync(db);

        var hiringManagerId = Guid.NewGuid();
        db.Employees.Add(new Employee
        {
            EmployeeId = hiringManagerId,
            FullName = "Hiring Manager",
            Email = "hm@example.com",
            Department = "Engineering"
        });

        var requisitionId = Guid.NewGuid();
        db.Requisitions.Add(new Requisition
        {
            RequisitionId = requisitionId,
            Title = "Backend Engineer",
            Department = "Engineering",
            EmploymentType = "FullTime",
            Seniority = "Mid",
            Skills = "C#",
            JobDescription = "Build APIs",
            Status = RequisitionStatuses.Published,
            HiringManagerEmployeeId = hiringManagerId
        });

        var candidateId = Guid.NewGuid();
        db.Candidates.Add(new Candidate
        {
            CandidateId = candidateId,
            FullName = "Ada Lovelace",
            Email = "ada@example.com",
            Phone = "03001234567"
        });

        var applicationId = Guid.NewGuid();
        db.Applications.Add(new Application
        {
            ApplicationId = applicationId,
            CandidateId = candidateId,
            RequisitionId = requisitionId,
            PipelineStageId = stages.AppliedId
        });

        await db.SaveChangesAsync();

        var user = ViewAllUser();
        var service = new ApplicationService(db, new RequisitionScopeService(db));
        return (db, service, user, applicationId, stages);
    }

    private static async Task<StageIds> SeedStagesAsync(AppDbContext db)
    {
        var applied = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Applied,
            SortOrder = 1,
            IsReserved = true
        };
        var screening = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Screening,
            SortOrder = 2
        };
        var disqualified = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Disqualified,
            SortOrder = 90,
            IsTerminal = true,
            IsReserved = true
        };
        var nfa = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Nfa,
            SortOrder = 91,
            IsTerminal = true,
            IsReserved = true
        };

        db.PipelineStages.AddRange(applied, screening, disqualified, nfa);
        await db.SaveChangesAsync();

        return new StageIds(
            applied.PipelineStageId,
            screening.PipelineStageId,
            disqualified.PipelineStageId,
            nfa.PipelineStageId);
    }

    private static ClaimsPrincipal ViewAllUser()
    {
        var identity = new ClaimsIdentity("Test");
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, "admin-user"));
        identity.AddClaim(new Claim(Permissions.ClaimType, Permissions.RequisitionsViewAll));
        return new ClaimsPrincipal(identity);
    }

    private sealed record StageIds(
        Guid AppliedId,
        Guid ScreeningId,
        Guid DisqualifiedId,
        Guid NfaId);
}
