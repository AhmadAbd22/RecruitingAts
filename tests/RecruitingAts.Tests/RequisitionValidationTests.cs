using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

public class RequisitionValidationTests
{
    [Theory]
    [InlineData(-1, 100)]
    [InlineData(100, -1)]
    [InlineData(null, -1)]
    [InlineData(200, 100)]
    public async Task InvalidBudget_IsRejectedWithoutChangingTheJob(int? minimum, int? maximum)
    {
        var (db, service, user, job) = await SeedAsync();
        await using var dispose = db;

        var result = await service.UpdateBudgetAsync(job.RequisitionId, minimum, maximum, user);

        Assert.Null(result.Detail);
        Assert.NotNull(result.Error);
        var saved = await db.Requisitions.SingleAsync();
        Assert.Equal(100000m, saved.BudgetMin);
        Assert.Equal(200000m, saved.BudgetMax);
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task BudgetBeyondSqlColumnCapacity_IsRejected()
    {
        var (db, service, user, job) = await SeedAsync();
        await using var dispose = db;

        var result = await service.UpdateBudgetAsync(job.RequisitionId, null, 10000000000000000m, user);

        Assert.Null(result.Detail);
        Assert.Equal("Budget values are too large to save.", result.Error);
        Assert.Equal(200000m, job.BudgetMax);
        Assert.Empty(db.AuditLogs);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(100, 100)]
    [InlineData(null, 100)]
    [InlineData(100, null)]
    [InlineData(null, null)]
    public async Task ValidOrEmptyBudget_IsSavedAndAudited(int? minimum, int? maximum)
    {
        var (db, service, user, job) = await SeedAsync();
        await using var dispose = db;

        var result = await service.UpdateBudgetAsync(job.RequisitionId, minimum, maximum, user);

        Assert.Null(result.Error);
        Assert.NotNull(result.Detail);
        Assert.Equal((decimal?)minimum, result.Detail.BudgetMin);
        Assert.Equal((decimal?)maximum, result.Detail.BudgetMax);
        Assert.Contains(db.AuditLogs, log => log.Action == "CompensationEdited");
    }

    [Theory]
    [InlineData("Title", 201)]
    [InlineData("Department", 201)]
    [InlineData("EmploymentType", 101)]
    [InlineData("Seniority", 101)]
    [InlineData("Skills", 1001)]
    public async Task Create_RejectsTextThatExceedsDatabaseLimits(string field, int length)
    {
        await using var db = TestFixture.CreateDb();
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test", "manager");
        await db.SaveChangesAsync();
        var request = ValidRequest(manager.EmployeeId);
        var text = new string('x', length);
        request = field switch
        {
            "Title" => request with { Title = text },
            "Department" => request with { Department = text },
            "EmploymentType" => request with { EmploymentType = text },
            "Seniority" => request with { Seniority = text },
            "Skills" => request with { Skills = text },
            _ => throw new ArgumentException("Unknown test field.")
        };

        var result = await TestFixture.CreateRequisitionService(db)
            .CreateAsync(request, TestFixture.User("manager", Permissions.RequisitionsManage));

        Assert.Null(result.Detail);
        Assert.NotNull(result.Error);
        Assert.Empty(db.Requisitions);
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task Create_AcceptsTextAtTheDatabaseLimits()
    {
        await using var db = TestFixture.CreateDb();
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test", "manager");
        await db.SaveChangesAsync();
        var request = ValidRequest(manager.EmployeeId) with
        {
            Title = new string('x', 200), Department = new string('x', 200),
            EmploymentType = new string('x', 100), Seniority = new string('x', 100),
            Skills = new string('x', 1000)
        };

        var result = await TestFixture.CreateRequisitionService(db)
            .CreateAsync(request, TestFixture.User("manager", Permissions.RequisitionsManage));

        Assert.Null(result.Error);
        Assert.NotNull(result.Detail);
        Assert.Single(db.Requisitions);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Create_RejectsInvalidOpeningCounts(int openings)
    {
        await using var db = TestFixture.CreateDb();
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test", "manager");
        await db.SaveChangesAsync();
        var result = await TestFixture.CreateRequisitionService(db).CreateAsync(
            ValidRequest(manager.EmployeeId) with { Openings = openings },
            TestFixture.User("manager", Permissions.RequisitionsManage));

        Assert.Null(result.Detail);
        Assert.Equal("Open positions must be at least 1.", result.Error);
        Assert.Empty(db.Requisitions);
    }

    [Theory]
    [InlineData("OnHold")]
    [InlineData("Closed")]
    [InlineData("Cancelled")]
    [InlineData("Filled")]
    public async Task StatusChange_RejectsOverlongReasonWithoutChangingStatus(string status)
    {
        var (db, service, user, job) = await SeedAsync();
        await using var dispose = db;
        var result = await service.ChangeStatusAsync(job.RequisitionId, status, new string('x', 1001), user);

        Assert.Null(result.Detail);
        Assert.Equal("Reason must be 1000 characters or fewer.", result.Error);
        Assert.Equal(RequisitionStatuses.Published, job.Status);
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task Rejection_RejectsOverlongReasonWithoutChangingStatus()
    {
        var (db, service, user, job) = await SeedAsync();
        await using var dispose = db;
        job.Status = RequisitionStatuses.PendingApproval;
        await db.SaveChangesAsync();

        var result = await service.RejectAsync(job.RequisitionId, new string('x', 1001), user);

        Assert.Null(result.Detail);
        Assert.Equal("Reason must be 1000 characters or fewer.", result.Error);
        Assert.Equal(RequisitionStatuses.PendingApproval, job.Status);
        Assert.Empty(db.AuditLogs);
    }

    private static CreateRequisitionRequest ValidRequest(Guid managerId) =>
        new("Developer", "Engineering", "FullTime", "Mid", "C#", "Build APIs", 1, managerId);

    private static async Task<(AppDbContext Db, RequisitionService Service, ClaimsPrincipal User, Requisition Job)> SeedAsync()
    {
        var db = TestFixture.CreateDb();
        var manager = TestFixture.AddEmployee(db, "Manager", "manager@example.test", "manager");
        var job = TestFixture.AddRequisition(db, manager.EmployeeId,
            status: RequisitionStatuses.Published, budgetMin: 100000, budgetMax: 200000);
        await db.SaveChangesAsync();
        var user = TestFixture.User("manager", Permissions.RequisitionsViewAll,
            Permissions.RequisitionsManage, Permissions.RequisitionsApprove, Permissions.CompensationEdit);
        return (db, TestFixture.CreateRequisitionService(db), user, job);
    }
}
