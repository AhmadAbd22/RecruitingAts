using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// Requisition status transitions (submit / approve / reject / publish / hold-close-cancel-fill).
/// </summary>
public class RequisitionStatusTests
{
    [Fact]
    public async Task Reject_WithoutReason_Fails()
    {
        var (db, service, approver, reqId) = await CreatePendingAsync();

        var (detail, error) = await service.RejectAsync(reqId, "   ", approver);

        Assert.Null(detail);
        Assert.Equal("Rejection reason is required.", error);

        var req = await db.Requisitions.SingleAsync(r => r.RequisitionId == reqId);
        Assert.Equal(RequisitionStatuses.PendingApproval, req.Status);
    }

    [Fact]
    public async Task Publish_OnlyFromApproved_Succeeds()
    {
        var (db, service, manager, reqId) = await CreateDraftOwnedAsync();

        var draftPublish = await service.PublishAsync(reqId, manager);
        Assert.Null(draftPublish.Detail);
        Assert.Equal("Only Approved requisitions can be published.", draftPublish.Error);

        Assert.Null((await service.SubmitForApprovalAsync(reqId, manager)).Error);

        var approver = TestFixture.User(
            "approver",
            Permissions.RequisitionsApprove,
            Permissions.RequisitionsViewAll);
        Assert.Null((await service.ApproveAsync(reqId, approver)).Error);

        var (detail, error) = await service.PublishAsync(reqId, manager);
        Assert.Null(error);
        Assert.NotNull(detail);
        Assert.Equal(RequisitionStatuses.Published, detail.Status);

        var stored = await db.Requisitions.SingleAsync(r => r.RequisitionId == reqId);
        Assert.Equal(RequisitionStatuses.Published, stored.Status);
    }

    [Fact]
    public async Task HoldOrCloseOrCancel_WithoutReason_Fails()
    {
        var (db, service, manager, reqId) = await CreatePublishedAsync();

        foreach (var status in new[]
                 {
                     RequisitionStatuses.OnHold,
                     RequisitionStatuses.Closed,
                     RequisitionStatuses.Cancelled
                 })
        {
            var (detail, error) = await service.ChangeStatusAsync(reqId, status, null, manager);
            Assert.Null(detail);
            Assert.Equal($"Reason is required for status {status}.", error);
        }

        var stored = await db.Requisitions.SingleAsync(r => r.RequisitionId == reqId);
        Assert.Equal(RequisitionStatuses.Published, stored.Status);
    }

    [Fact]
    public async Task Fill_WithoutReason_Succeeds()
    {
        var (db, service, manager, reqId) = await CreatePublishedAsync();

        var (detail, error) = await service.ChangeStatusAsync(
            reqId, RequisitionStatuses.Filled, reason: null, manager);

        Assert.Null(error);
        Assert.NotNull(detail);
        Assert.Equal(RequisitionStatuses.Filled, detail.Status);

        var stored = await db.Requisitions.SingleAsync(r => r.RequisitionId == reqId);
        Assert.Equal(RequisitionStatuses.Filled, stored.Status);
    }

    [Fact]
    public async Task Creator_BecomesOwner()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        const string creatorUserId = "creator-1";
        var creator = TestFixture.AddEmployee(
            db, "Creator", "creator@example.com", creatorUserId);
        await db.SaveChangesAsync();

        var user = TestFixture.User(
            creatorUserId,
            Permissions.RequisitionsManage,
            Permissions.RequisitionsViewAll);
        var service = TestFixture.CreateRequisitionService(db);

        var (detail, error) = await service.CreateAsync(
            new CreateRequisitionRequest(
                Title: "New Role",
                Department: "Engineering",
                EmploymentType: "FullTime",
                Seniority: "Mid",
                Skills: "C#",
                JobDescription: "Build APIs",
                Openings: 1,
                HiringManagerEmployeeId: hm.EmployeeId),
            user);

        Assert.Null(error);
        Assert.NotNull(detail);
        Assert.Equal(RequisitionStatuses.Draft, detail.Status);
        Assert.Contains(detail.Team, t =>
            t.EmployeeId == creator.EmployeeId && t.TeamRole == TeamRoles.Owner);

        var ownerCount = await db.RequisitionTeamMembers.CountAsync(t =>
            t.RequisitionId == detail.RequisitionId && t.TeamRole == TeamRoles.Owner);
        Assert.Equal(1, ownerCount);
    }

    private static async Task<(
        AppDbContext Db,
        RequisitionService Service,
        ClaimsPrincipal Manager,
        Guid ReqId)> CreateDraftOwnedAsync()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        const string managerUserId = "manager-1";
        var managerEmp = TestFixture.AddEmployee(
            db, "Manager", "manager@example.com", managerUserId);
        var req = TestFixture.AddRequisition(db, hm.EmployeeId, status: RequisitionStatuses.Draft);
        TestFixture.AddTeamMember(db, req.RequisitionId, managerEmp.EmployeeId, TeamRoles.Owner);
        await db.SaveChangesAsync();

        var manager = TestFixture.User(
            managerUserId,
            Permissions.RequisitionsManage,
            Permissions.RequisitionsViewAll);
        return (db, TestFixture.CreateRequisitionService(db), manager, req.RequisitionId);
    }

    private static async Task<(
        AppDbContext Db,
        RequisitionService Service,
        ClaimsPrincipal Approver,
        Guid ReqId)> CreatePendingAsync()
    {
        var (db, service, manager, reqId) = await CreateDraftOwnedAsync();
        Assert.Null((await service.SubmitForApprovalAsync(reqId, manager)).Error);

        var approver = TestFixture.User(
            "approver",
            Permissions.RequisitionsApprove,
            Permissions.RequisitionsViewAll);
        return (db, service, approver, reqId);
    }

    private static async Task<(
        AppDbContext Db,
        RequisitionService Service,
        ClaimsPrincipal Manager,
        Guid ReqId)> CreatePublishedAsync()
    {
        var (db, service, manager, reqId) = await CreateDraftOwnedAsync();
        Assert.Null((await service.SubmitForApprovalAsync(reqId, manager)).Error);

        var approver = TestFixture.User(
            "approver",
            Permissions.RequisitionsApprove,
            Permissions.RequisitionsViewAll);
        Assert.Null((await service.ApproveAsync(reqId, approver)).Error);
        Assert.Null((await service.PublishAsync(reqId, manager)).Error);

        return (db, service, manager, reqId);
    }
}
