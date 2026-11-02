using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

public class PipelineStageManagementTests
{
    [Fact]
    public async Task WorkingStage_CanBeCreatedEditedAndDeleted_WithAudit()
    {
        await using var db = TestFixture.CreateDb();
        var service = new PipelineStageService(db, new AuditService(db));
        var user = TestFixture.User("admin");
        var (stage, error) = await service.SaveAsync(null, new("Portfolio review", 5), user);
        Assert.Null(error);
        Assert.NotNull(stage);
        var (_, editError) = await service.SaveAsync(stage.PipelineStageId, new("Technical review", 6), user);
        Assert.Null(editError);
        Assert.Equal("Technical review", stage.Name);
        Assert.Null(await service.DeleteAsync(stage.PipelineStageId, user));
        Assert.Empty(await db.PipelineStages.ToListAsync());
        Assert.Equal(3, await db.AuditLogs.CountAsync(a => a.UserId == "admin"));
    }

    [Fact]
    public async Task ReservedStage_CannotBeEditedOrDeleted()
    {
        await using var db = TestFixture.CreateDb();
        var stage = new PipelineStage { Name = "Applied", IsReserved = true, SortOrder = 1 };
        db.PipelineStages.Add(stage);
        await db.SaveChangesAsync();
        var service = new PipelineStageService(db, new AuditService(db));
        var user = TestFixture.User("admin");
        Assert.NotNull((await service.SaveAsync(stage.PipelineStageId, new("Changed", 5), user)).Error);
        Assert.NotNull(await service.DeleteAsync(stage.PipelineStageId, user));
        Assert.Equal("Applied", stage.Name);
        Assert.Empty(db.AuditLogs);
    }

    [Theory]
    [InlineData("", 4)]
    [InlineData("Applied", 4)]
    [InlineData("Review", 100)]
    [InlineData("Review", 1)]
    public async Task InvalidWorkingStage_IsRejected(string name, int order)
    {
        await using var db = TestFixture.CreateDb();
        var service = new PipelineStageService(db, new AuditService(db));
        Assert.NotNull((await service.SaveAsync(null, new(name, order), TestFixture.User("admin"))).Error);
        Assert.Empty(db.PipelineStages);
    }

    [Fact]
    public async Task DuplicateName_AndDeletingUsedStage_AreRejected()
    {
        await using var db = TestFixture.CreateDb();
        var stage = new PipelineStage { Name = "Review", SortOrder = 4 };
        db.PipelineStages.Add(stage);
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test");
        var req = TestFixture.AddRequisition(db, manager.EmployeeId);
        var candidate = new Candidate { FullName = "Candidate", Email = "test@example.test", Phone = "+12025550101" };
        db.Candidates.Add(candidate);
        db.Applications.Add(new Application { CandidateId = candidate.CandidateId, RequisitionId = req.RequisitionId, PipelineStageId = stage.PipelineStageId });
        await db.SaveChangesAsync();
        var service = new PipelineStageService(db, new AuditService(db));
        var user = TestFixture.User("admin");
        Assert.NotNull((await service.SaveAsync(null, new(" review ", 8), user)).Error);
        Assert.NotNull(await service.DeleteAsync(stage.PipelineStageId, user));
        Assert.Single(db.PipelineStages);
    }
}
