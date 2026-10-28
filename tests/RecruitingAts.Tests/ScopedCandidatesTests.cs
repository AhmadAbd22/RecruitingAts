using System.Security.Claims;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// Scoped candidate search for ApplicationsManage (HM add-to-requisition).
/// </summary>
public class ScopedCandidatesTests
{
    [Fact]
    public async Task GetScopedCandidates_OnlyReturnsCandidatesOnScopedApplications()
    {
        var (db, service, teamUser, inScopeCandidateId, _) =
            await CreateScopedFixtureAsync();

        var results = await service.GetScopedCandidatesAsync(teamUser, query: null);

        var match = Assert.Single(results);
        Assert.Equal(inScopeCandidateId, match.CandidateId);
        Assert.Equal("In Scope Candidate", match.FullName);
    }

    [Fact]
    public async Task GetScopedCandidates_FiltersByQuery()
    {
        var (db, service, teamUser, inScopeCandidateId, _) =
            await CreateScopedFixtureAsync();

        var inScopeReqId = await GetInScopeRequisitionIdAsync(db, teamUser);
        var otherId = Guid.NewGuid();
        db.Candidates.Add(new Candidate
        {
            CandidateId = otherId,
            FullName = "Other In Scope",
            Email = "other@example.com",
            Phone = "03003333333"
        });
        var applied = db.PipelineStages.First(s => s.Name == PipelineStageNames.Applied);
        db.Applications.Add(new Application
        {
            ApplicationId = Guid.NewGuid(),
            CandidateId = otherId,
            RequisitionId = inScopeReqId,
            PipelineStageId = applied.PipelineStageId
        });
        await db.SaveChangesAsync();

        var byName = await service.GetScopedCandidatesAsync(teamUser, "Other");
        Assert.Single(byName);
        Assert.Equal(otherId, byName[0].CandidateId);

        var byEmail = await service.GetScopedCandidatesAsync(teamUser, "in@example.com");
        Assert.Single(byEmail);
        Assert.Equal(inScopeCandidateId, byEmail[0].CandidateId);

        var none = await service.GetScopedCandidatesAsync(teamUser, "zzzz-no-match");
        Assert.Empty(none);
    }

    [Fact]
    public async Task GetScopedCandidates_DedupesCandidateWithMultipleScopedApplications()
    {
        var (db, service, teamUser, inScopeCandidateId, hiringManagerId) =
            await CreateScopedFixtureAsync();

        var secondReq = TestFixture.AddRequisition(
            db,
            hiringManagerId,
            title: "Second Scoped Role",
            status: RequisitionStatuses.Published);
        var teamEmployeeId = db.Employees.Single(e => e.UserId == "recruiter-1").EmployeeId;
        TestFixture.AddTeamMember(db, secondReq.RequisitionId, teamEmployeeId, TeamRoles.Recruiter);

        var applied = db.PipelineStages.First(s => s.Name == PipelineStageNames.Applied);
        db.Applications.Add(new Application
        {
            ApplicationId = Guid.NewGuid(),
            CandidateId = inScopeCandidateId,
            RequisitionId = secondReq.RequisitionId,
            PipelineStageId = applied.PipelineStageId
        });
        await db.SaveChangesAsync();

        var results = await service.GetScopedCandidatesAsync(teamUser, query: null);

        Assert.Single(results);
        Assert.Equal(inScopeCandidateId, results[0].CandidateId);
    }

    [Fact]
    public async Task GetScopedCandidates_EmptyWhenUserHasNoScopedRequisitions()
    {
        var (db, service, _, _, _) = await CreateScopedFixtureAsync();

        var stranger = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "stranger-user")
        ], "Test"));

        var results = await service.GetScopedCandidatesAsync(stranger, query: null);

        Assert.Empty(results);
    }

    private static async Task<(
        AppDbContext Db,
        ApplicationService Service,
        ClaimsPrincipal TeamUser,
        Guid InScopeCandidateId,
        Guid HiringManagerId)> CreateScopedFixtureAsync()
    {
        var db = TestFixture.CreateDb();

        var applied = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Applied,
            SortOrder = 1,
            IsReserved = true
        };
        db.PipelineStages.Add(applied);

        var hiringManager = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        var teamEmployee = TestFixture.AddEmployee(
            db, "Team Recruiter", "recruiter@example.com", userId: "recruiter-1", department: "TA");

        var inScopeReq = TestFixture.AddRequisition(
            db, hiringManager.EmployeeId, title: "In Scope Role", status: RequisitionStatuses.Published);
        var outOfScopeReq = TestFixture.AddRequisition(
            db, hiringManager.EmployeeId, title: "Out Of Scope Role", status: RequisitionStatuses.Published);

        TestFixture.AddTeamMember(db, inScopeReq.RequisitionId, teamEmployee.EmployeeId, TeamRoles.Recruiter);

        var inScopeCandidateId = Guid.NewGuid();
        var outOfScopeCandidateId = Guid.NewGuid();
        db.Candidates.AddRange(
            new Candidate
            {
                CandidateId = inScopeCandidateId,
                FullName = "In Scope Candidate",
                Email = "in@example.com",
                Phone = "03001111111"
            },
            new Candidate
            {
                CandidateId = outOfScopeCandidateId,
                FullName = "Out Of Scope Candidate",
                Email = "out@example.com",
                Phone = "03002222222"
            });

        db.Applications.AddRange(
            new Application
            {
                ApplicationId = Guid.NewGuid(),
                CandidateId = inScopeCandidateId,
                RequisitionId = inScopeReq.RequisitionId,
                PipelineStageId = applied.PipelineStageId
            },
            new Application
            {
                ApplicationId = Guid.NewGuid(),
                CandidateId = outOfScopeCandidateId,
                RequisitionId = outOfScopeReq.RequisitionId,
                PipelineStageId = applied.PipelineStageId
            });

        await db.SaveChangesAsync();

        var teamUser = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "recruiter-1")
        ], "Test"));

        var service = new ApplicationService(db, new RequisitionScopeService(db));
        return (db, service, teamUser, inScopeCandidateId, hiringManager.EmployeeId);
    }

    private static async Task<Guid> GetInScopeRequisitionIdAsync(
        AppDbContext db,
        ClaimsPrincipal teamUser)
    {
        var scope = new RequisitionScopeService(db);
        var employeeId = await scope.GetEmployeeIdAsync(teamUser);
        var req = scope.Scope(db.Requisitions, teamUser, employeeId).Single();
        return req.RequisitionId;
    }
}
