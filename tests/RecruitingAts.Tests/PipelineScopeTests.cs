using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-APP-009 — pipeline board respects requisition scope.
/// </summary>
public class PipelineScopeTests
{
    [Fact]
    public async Task Board_OnlyShowsApplicationsInScopedRequisitions()
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

        const string teamUserId = "recruiter-1";
        var teamEmployeeId = Guid.NewGuid();
        db.Employees.Add(new Employee
        {
            EmployeeId = teamEmployeeId,
            UserId = teamUserId,
            FullName = "Team Recruiter",
            Email = "recruiter@example.com",
            Department = "TA"
        });

        var inScopeReqId = Guid.NewGuid();
        var outOfScopeReqId = Guid.NewGuid();

        db.Requisitions.AddRange(
            new Requisition
            {
                RequisitionId = inScopeReqId,
                Title = "In Scope Role",
                Department = "Engineering",
                EmploymentType = "FullTime",
                Seniority = "Mid",
                Skills = "C#",
                JobDescription = "Scoped",
                Status = RequisitionStatuses.Published,
                HiringManagerEmployeeId = hiringManagerId
            },
            new Requisition
            {
                RequisitionId = outOfScopeReqId,
                Title = "Out Of Scope Role",
                Department = "Engineering",
                EmploymentType = "FullTime",
                Seniority = "Mid",
                Skills = "C#",
                JobDescription = "Hidden",
                Status = RequisitionStatuses.Published,
                HiringManagerEmployeeId = hiringManagerId
            });

        db.RequisitionTeamMembers.Add(new RequisitionTeamMember
        {
            RequisitionTeamMemberId = Guid.NewGuid(),
            RequisitionId = inScopeReqId,
            EmployeeId = teamEmployeeId,
            TeamRole = TeamRoles.Recruiter
        });

        var candidateA = Guid.NewGuid();
        var candidateB = Guid.NewGuid();
        db.Candidates.AddRange(
            new Candidate
            {
                CandidateId = candidateA,
                FullName = "In Scope Candidate",
                Email = "in@example.com",
                Phone = "03001111111"
            },
            new Candidate
            {
                CandidateId = candidateB,
                FullName = "Out Of Scope Candidate",
                Email = "out@example.com",
                Phone = "03002222222"
            });

        var inScopeAppId = Guid.NewGuid();
        db.Applications.AddRange(
            new Application
            {
                ApplicationId = inScopeAppId,
                CandidateId = candidateA,
                RequisitionId = inScopeReqId,
                PipelineStageId = applied.PipelineStageId
            },
            new Application
            {
                ApplicationId = Guid.NewGuid(),
                CandidateId = candidateB,
                RequisitionId = outOfScopeReqId,
                PipelineStageId = applied.PipelineStageId
            });

        await db.SaveChangesAsync();

        var teamUser = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, teamUserId)
        ], "Test"));

        var service = new ApplicationService(db, new RequisitionScopeService(db));
        var board = await service.GetPipelineAsync(teamUser);

        Assert.Single(board);
        Assert.Equal(inScopeAppId, board[0].ApplicationId);
        Assert.Equal(inScopeReqId, board[0].RequisitionId);
        Assert.Equal(candidateA, board[0].CandidateId);
        Assert.Equal("In Scope Candidate", board[0].CandidateName);
        Assert.Equal("In Scope Role", board[0].RequisitionTitle);
        Assert.Equal(applied.PipelineStageId, board[0].PipelineStageId);
        Assert.Equal(PipelineStageNames.Applied, board[0].StageName);
    }
}
