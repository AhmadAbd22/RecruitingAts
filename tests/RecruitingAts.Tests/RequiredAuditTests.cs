using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

public class RequiredAuditTests
{
    [Fact]
    public async Task AuditList_OnlyReturnsCompensationActivityForAccessibleJobs()
    {
        await using var db = TestFixture.CreateDb();
        db.Users.Add(new ApplicationUser { Id = "manager", FullName = "Manager", UserName = "manager@example.test" });
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test", "manager");
        var own = TestFixture.AddRequisition(db, manager.EmployeeId, title: "Own job");
        var other = TestFixture.AddRequisition(db, manager.EmployeeId, title: "Other job");
        TestFixture.AddTeamMember(db, own.RequisitionId, manager.EmployeeId, TeamRoles.Owner);
        var audit = new AuditService(db);
        await audit.LogAsync("manager", "CompensationViewed", "Requisition", own.RequisitionId.ToString());
        await audit.LogAsync("manager", "CompensationViewed", "Requisition", other.RequisitionId.ToString());
        await audit.LogAsync("manager", "RequisitionCreated", "Requisition", own.RequisitionId.ToString());
        var items = await new CompensationAuditService(db, new RequisitionScopeService(db))
            .ListAsync(TestFixture.User("manager", Permissions.CompensationView));
        Assert.Equal("Own job", Assert.Single(items).RequisitionTitle);
    }

    [Theory]
    [InlineData(Permissions.CompensationView, true)]
    [InlineData(Permissions.CompensationEdit, true)]
    [InlineData(Permissions.RequisitionsManage, false)]
    public async Task List_OnlyExposesAndAuditsPermittedBudgets(string permission, bool visible)
    {
        await using var db = TestFixture.CreateDb();
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test");
        TestFixture.AddRequisition(db, manager.EmployeeId, budgetMin: 100000, budgetMax: 150000);
        TestFixture.AddRequisition(db, manager.EmployeeId, title: "Without budget");
        await db.SaveChangesAsync();
        var user = TestFixture.User("reader", Permissions.RequisitionsViewAll, permission);
        var items = await TestFixture.CreateRequisitionService(db).ListAsync(user);
        Assert.Equal(visible ? 1 : 0, items.Count(r => r.BudgetMin.HasValue));
        var logs = await db.AuditLogs.ToListAsync();
        Assert.Equal(visible ? 1 : 0, logs.Count);
        if (visible) Assert.Equal("reader", logs[0].UserId);
    }

    [Fact]
    public async Task StageMove_RecordsActorAndOldAndNewStage_AndRejectedMoveDoesNot()
    {
        await using var db = TestFixture.CreateDb();
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test");
        var req = TestFixture.AddRequisition(db, manager.EmployeeId, status: RequisitionStatuses.Published);
        var candidate = new Candidate { FullName = "Candidate", Email = "test@example.test", Phone = "+12025550101" };
        var applied = new PipelineStage { Name = "Applied", SortOrder = 1, IsReserved = true };
        var review = new PipelineStage { Name = "Review", SortOrder = 4 };
        db.Candidates.Add(candidate);
        db.PipelineStages.AddRange(applied, review);
        var application = new Application { CandidateId = candidate.CandidateId, RequisitionId = req.RequisitionId, PipelineStageId = applied.PipelineStageId };
        db.Applications.Add(application);
        await db.SaveChangesAsync();
        var service = new ApplicationService(db, new RequisitionScopeService(db), new AuditService(db));
        var result = await service.UpdateStageAsync(application.ApplicationId, new(review.PipelineStageId, null), TestFixture.User("actor", Permissions.RequisitionsViewAll));
        Assert.Equal(ApplicationStageUpdateStatus.Success, result.Status);
        var log = Assert.Single(db.AuditLogs);
        Assert.Equal("actor", log.UserId);
        Assert.Equal(application.ApplicationId.ToString(), log.EntityId);
        Assert.Equal("Stage: Applied -> Review", log.Details);
        await service.UpdateStageAsync(application.ApplicationId, new(applied.PipelineStageId, null), TestFixture.User("outsider"));
        Assert.Single(db.AuditLogs);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Create_RejectsMissingOrInactiveHiringManager(bool missing)
    {
        await using var db = TestFixture.CreateDb();
        TestFixture.AddEmployee(db, "Creator", "creator@example.test", "creator");
        var inactive = TestFixture.AddEmployee(db, "Inactive", "inactive@example.test");
        inactive.IsActive = false;
        await db.SaveChangesAsync();
        var (detail, error) = await TestFixture.CreateRequisitionService(db).CreateAsync(
            new("Engineer", "Engineering", "FullTime", "Mid", "C#", "Build APIs", 1,
                missing ? Guid.NewGuid() : inactive.EmployeeId),
            TestFixture.User("creator", Permissions.RequisitionsManage));
        Assert.Null(detail);
        Assert.NotNull(error);
        Assert.Empty(db.Requisitions);
    }
}
