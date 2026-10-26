using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-APP-001 / FR-APP-002 — create application for a published requisition.
/// </summary>
public class ApplicationCreateTests
{
    [Fact]
    public async Task Create_ForPublishedRequisition_StartsAtApplied()
    {
        var (db, service, user, candidateId, requisitionId, appliedId) =
            await CreateFixtureAsync();

        var result = await service.CreateAsync(
            new CreateApplicationRequest(candidateId, requisitionId, "Referral"),
            user);

        Assert.Equal(ApplicationCreateStatus.Success, result.Status);
        Assert.NotNull(result.Application);
        Assert.Equal(candidateId, result.Application.CandidateId);
        Assert.Equal(requisitionId, result.Application.RequisitionId);
        Assert.Equal(appliedId, result.Application.PipelineStageId);
        Assert.Equal("Referral", result.Application.Source);

        var stored = await db.Applications.SingleAsync();
        Assert.Equal(result.Application.ApplicationId, stored.ApplicationId);
        Assert.Equal(appliedId, stored.PipelineStageId);
    }

    [Fact]
    public async Task Create_CandidateMissing_Fails()
    {
        var (_, service, user, _, requisitionId, _) = await CreateFixtureAsync();

        var result = await service.CreateAsync(
            new CreateApplicationRequest(Guid.NewGuid(), requisitionId, null),
            user);

        Assert.Equal(ApplicationCreateStatus.CandidateNotFound, result.Status);
    }

    [Fact]
    public async Task Create_RequisitionMissing_Fails()
    {
        var (_, service, user, candidateId, _, _) = await CreateFixtureAsync();

        var result = await service.CreateAsync(
            new CreateApplicationRequest(candidateId, Guid.NewGuid(), null),
            user);

        Assert.Equal(ApplicationCreateStatus.RequisitionNotFound, result.Status);
    }

    [Fact]
    public async Task Create_RequisitionNotPublished_Fails()
    {
        var (db, service, user, candidateId, requisitionId, _) =
            await CreateFixtureAsync(requisitionStatus: RequisitionStatuses.Draft);

        var result = await service.CreateAsync(
            new CreateApplicationRequest(candidateId, requisitionId, null),
            user);

        Assert.Equal(ApplicationCreateStatus.RequisitionNotPublished, result.Status);
        Assert.Empty(db.Applications);
    }

    [Fact]
    public async Task Create_Duplicate_Fails()
    {
        var (db, service, user, candidateId, requisitionId, appliedId) =
            await CreateFixtureAsync();

        db.Applications.Add(new Application
        {
            ApplicationId = Guid.NewGuid(),
            CandidateId = candidateId,
            RequisitionId = requisitionId,
            PipelineStageId = appliedId
        });
        await db.SaveChangesAsync();

        var result = await service.CreateAsync(
            new CreateApplicationRequest(candidateId, requisitionId, null),
            user);

        Assert.Equal(ApplicationCreateStatus.DuplicateApplication, result.Status);
        Assert.Equal(1, await db.Applications.CountAsync());
    }

    [Fact]
    public async Task Create_OutOfScope_Fails()
    {
        var (_, service, _, candidateId, requisitionId, _) =
            await CreateFixtureAsync();

        var outsider = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "outsider")
        ], "Test"));

        var result = await service.CreateAsync(
            new CreateApplicationRequest(candidateId, requisitionId, null),
            outsider);

        Assert.Equal(ApplicationCreateStatus.Forbidden, result.Status);
    }

    private static async Task<(
        AppDbContext Db,
        ApplicationService Service,
        ClaimsPrincipal User,
        Guid CandidateId,
        Guid RequisitionId,
        Guid AppliedStageId)> CreateFixtureAsync(
        string requisitionStatus = RequisitionStatuses.Published)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);

        var applied = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Applied,
            SortOrder = 1,
            IsReserved = true
        };
        db.PipelineStages.Add(applied);

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
            Status = requisitionStatus,
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

        await db.SaveChangesAsync();

        var user = ViewAllUser();
        var service = new ApplicationService(db, new RequisitionScopeService(db));
        return (db, service, user, candidateId, requisitionId, applied.PipelineStageId);
    }

    private static ClaimsPrincipal ViewAllUser()
    {
        var identity = new ClaimsIdentity("Test");
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, "admin-user"));
        identity.AddClaim(new Claim(Permissions.ClaimType, Permissions.RequisitionsViewAll));
        return new ClaimsPrincipal(identity);
    }
}
