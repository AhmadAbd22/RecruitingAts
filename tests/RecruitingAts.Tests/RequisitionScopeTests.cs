using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-ATS-001 — requisition scope (VIEW.ALL vs team membership).
/// </summary>
public class RequisitionScopeTests
{
    [Fact]
    public async Task Admin_WithViewAll_CanSeeAllRequisitions()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        var inScope = TestFixture.AddRequisition(db, hm.EmployeeId, "Role A");
        var outOfScope = TestFixture.AddRequisition(db, hm.EmployeeId, "Role B");
        await db.SaveChangesAsync();

        var admin = TestFixture.User(
            "admin-user",
            Permissions.RequisitionsViewAll,
            Permissions.RequisitionsManage);

        var service = TestFixture.CreateRequisitionService(db);
        var list = await service.ListAsync(admin);

        Assert.Equal(2, list.Count);
        Assert.Contains(list, r => r.RequisitionId == inScope.RequisitionId);
        Assert.Contains(list, r => r.RequisitionId == outOfScope.RequisitionId);
    }

    [Fact]
    public async Task NonAdmin_SeesOnlyRequisitionsOnTheirTeam()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        const string recruiterUserId = "recruiter-1";
        var recruiter = TestFixture.AddEmployee(
            db, "Team Recruiter", "recruiter@example.com", recruiterUserId, "TA");

        var mine = TestFixture.AddRequisition(db, hm.EmployeeId, "My Role");
        var theirs = TestFixture.AddRequisition(db, hm.EmployeeId, "Other Role");
        TestFixture.AddTeamMember(db, mine.RequisitionId, recruiter.EmployeeId, TeamRoles.Recruiter);
        await db.SaveChangesAsync();

        var user = TestFixture.User(recruiterUserId);
        var service = TestFixture.CreateRequisitionService(db);
        var list = await service.ListAsync(user);

        Assert.Single(list);
        Assert.Equal(mine.RequisitionId, list[0].RequisitionId);
        Assert.DoesNotContain(list, r => r.RequisitionId == theirs.RequisitionId);
    }

    [Fact]
    public async Task NonAdmin_NotOnTeam_CannotAccessRequisition()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        var req = TestFixture.AddRequisition(db, hm.EmployeeId);
        await db.SaveChangesAsync();

        var outsider = TestFixture.User("outsider");
        var service = TestFixture.CreateRequisitionService(db);

        var detail = await service.GetAsync(req.RequisitionId, outsider);
        Assert.Null(detail);

        var scope = new RequisitionScopeService(db);
        Assert.False(await scope.CanAccessAsync(req.RequisitionId, outsider));
    }
}
