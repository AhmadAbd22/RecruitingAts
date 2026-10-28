using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-ATS-002 — compensation hide + audit on view.
/// </summary>
public class CompensationTests
{
    [Fact]
    public async Task WithoutPermission_BudgetFieldsAreOmitted()
    {
        var (db, reqId) = await SeedWithBudgetAsync();
        var user = TestFixture.User("viewer", Permissions.RequisitionsViewAll);
        var service = TestFixture.CreateRequisitionService(db);

        var detail = await service.GetAsync(reqId, user);
        var list = await service.ListAsync(user);

        Assert.NotNull(detail);
        Assert.Null(detail.BudgetMin);
        Assert.Null(detail.BudgetMax);

        var listItem = Assert.Single(list);
        Assert.Null(listItem.BudgetMin);
        Assert.Null(listItem.BudgetMax);
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task WithPermission_BudgetFieldsAreReturned()
    {
        var (db, reqId) = await SeedWithBudgetAsync();
        var user = TestFixture.User(
            "comp-viewer",
            Permissions.RequisitionsViewAll,
            Permissions.CompensationView);
        var service = TestFixture.CreateRequisitionService(db);

        var detail = await service.GetAsync(reqId, user);
        var list = await service.ListAsync(user);

        Assert.NotNull(detail);
        Assert.Equal(100_000m, detail.BudgetMin);
        Assert.Equal(140_000m, detail.BudgetMax);

        var listItem = Assert.Single(list);
        Assert.Equal(100_000m, listItem.BudgetMin);
        Assert.Equal(140_000m, listItem.BudgetMax);
    }

    [Fact]
    public async Task ViewingCompensation_WritesAuditLog()
    {
        var (db, reqId) = await SeedWithBudgetAsync();
        var user = TestFixture.User(
            "comp-viewer",
            Permissions.RequisitionsViewAll,
            Permissions.CompensationView);
        var service = TestFixture.CreateRequisitionService(db);

        await service.GetAsync(reqId, user);

        var log = Assert.Single(db.AuditLogs);
        Assert.Equal("comp-viewer", log.UserId);
        Assert.Equal("CompensationViewed", log.Action);
        Assert.Equal(nameof(RecruitingAts.Api.Data.Entities.Requisition), log.EntityType);
        Assert.Equal(reqId.ToString(), log.EntityId);

        // List does not audit individual compensation views.
        db.AuditLogs.RemoveRange(db.AuditLogs);
        await db.SaveChangesAsync();
        await service.ListAsync(user);
        Assert.Empty(await db.AuditLogs.ToListAsync());
    }

    private static async Task<(AppDbContext Db, Guid ReqId)> SeedWithBudgetAsync()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        var req = TestFixture.AddRequisition(
            db,
            hm.EmployeeId,
            status: RequisitionStatuses.Published,
            budgetMin: 100_000m,
            budgetMax: 140_000m);
        await db.SaveChangesAsync();
        return (db, req.RequisitionId);
    }
}
