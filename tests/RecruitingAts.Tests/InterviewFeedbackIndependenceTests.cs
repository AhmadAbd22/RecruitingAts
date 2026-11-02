using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

public class InterviewFeedbackIndependenceTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PanelMember_CannotReadBeforeOwnSubmission_EvenWithAdminAccess(bool admin)
    {
        var (db, interview, self, peer) = await SeedAsync();
        await using var dispose = db;
        var service = new InterviewService(db, new RequisitionScopeService(db));
        await service.SubmitFeedbackAsync(interview.InterviewId, Feedback(), TestFixture.User("peer"));
        var user = admin ? TestFixture.User("self", Permissions.RequisitionsViewAll) : TestFixture.User("self");
        var hidden = await service.GetFeedbackAsync(interview.InterviewId, user);
        Assert.Equal(InterviewFeedbackStatus.Forbidden, hidden.Status);
        Assert.Null(hidden.Items);
        Assert.Equal(InterviewFeedbackStatus.Success, (await service.SubmitFeedbackAsync(interview.InterviewId, Feedback(), user)).Status);
        var visible = await service.GetFeedbackAsync(interview.InterviewId, user);
        Assert.Equal(InterviewFeedbackStatus.Success, visible.Status);
        Assert.Equal(2, visible.Items!.Count);
        Assert.Contains(visible.Items, f => f.InterviewerEmployeeId == peer.EmployeeId);
        Assert.Contains(visible.Items, f => f.InterviewerEmployeeId == self.EmployeeId);
    }

    [Fact]
    public async Task OwnSubmission_UnlocksFeedbackWithoutWaitingForPeers_AndCannotBeRepeated()
    {
        var (db, interview, _, _) = await SeedAsync();
        await using var dispose = db;
        var service = new InterviewService(db, new RequisitionScopeService(db));
        var user = TestFixture.User("self");
        Assert.Equal(InterviewFeedbackStatus.Success, (await service.SubmitFeedbackAsync(interview.InterviewId, Feedback(), user)).Status);
        Assert.Single((await service.GetFeedbackAsync(interview.InterviewId, user)).Items!);
        Assert.Equal(InterviewFeedbackStatus.AlreadySubmitted, (await service.SubmitFeedbackAsync(interview.InterviewId, Feedback(), user)).Status);
        Assert.Single(db.InterviewFeedbacks);
    }

    [Theory]
    [InlineData(0, "Good", "Improve")]
    [InlineData(6, "Good", "Improve")]
    [InlineData(3, " ", "Improve")]
    [InlineData(3, "Good", " ")]
    public async Task InvalidFeedback_IsNotSaved(int rating, string strengths, string concerns)
    {
        var (db, interview, _, _) = await SeedAsync();
        await using var dispose = db;
        var service = new InterviewService(db, new RequisitionScopeService(db));
        var result = await service.SubmitFeedbackAsync(interview.InterviewId,
            new(rating, strengths, concerns, "Hire"), TestFixture.User("self"));
        Assert.Equal(InterviewFeedbackStatus.Invalid, result.Status);
        Assert.Empty(db.InterviewFeedbacks);
    }

    [Fact]
    public async Task UnassignedOrOutOfScopeUser_CannotSubmit_AndPersonalListOnlyShowsAssignments()
    {
        var (db, interview, _, _) = await SeedAsync();
        await using var dispose = db;
        TestFixture.AddEmployee(db, "Admin", "admin@example.test", "admin");
        await db.SaveChangesAsync();
        var service = new InterviewService(db, new RequisitionScopeService(db));
        var admin = TestFixture.User("admin", Permissions.RequisitionsViewAll, Permissions.InterviewsSchedule);
        Assert.Equal(InterviewFeedbackStatus.Forbidden, (await service.SubmitFeedbackAsync(interview.InterviewId, Feedback(), admin)).Status);
        Assert.Equal(InterviewFeedbackStatus.NotFound, (await service.GetFeedbackAsync(interview.InterviewId, TestFixture.User("outsider"))).Status);
        Assert.Empty(await service.GetMyInterviewsAsync(admin));
        Assert.Empty(await service.GetMyInterviewsAsync(TestFixture.User("unlinked", Permissions.RequisitionsViewAll)));
        Assert.Single(await service.GetMyInterviewsAsync(TestFixture.User("self")));
    }

    [Fact]
    public async Task Scheduling_RejectsWrongPanelAndLead_AndCreatesValidPanel()
    {
        var (db, interview, self, peer) = await SeedAsync();
        await using var dispose = db;
        var service = new InterviewService(db, new RequisitionScopeService(db));
        var user = TestFixture.User("scheduler", Permissions.RequisitionsViewAll);
        var request = new CreateInterviewRequest(interview.ApplicationId, "Technical", "Video", DateTimeOffset.UtcNow.AddDays(1), [self.EmployeeId], peer.EmployeeId);
        Assert.Equal(InterviewCreateStatus.Invalid, (await service.CreateAsync(request, user)).Status);
        Assert.Equal(InterviewCreateStatus.Invalid, (await service.CreateAsync(request with { PanelEmployeeIds = [Guid.NewGuid()], LeadEmployeeId = null }, user)).Status);
        Assert.Equal(InterviewCreateStatus.Invalid, (await service.CreateAsync(request with { PanelEmployeeIds = [self.EmployeeId, self.EmployeeId], LeadEmployeeId = null }, user)).Status);
        Assert.Equal(InterviewCreateStatus.Forbidden, (await service.CreateAsync(request, TestFixture.User("outsider"))).Status);
        var valid = await service.CreateAsync(request with { LeadEmployeeId = self.EmployeeId }, user);
        Assert.Equal(InterviewCreateStatus.Success, valid.Status);
        Assert.True(Assert.Single(valid.Interview!.Panel).IsLead);
    }

    private static SubmitInterviewFeedbackRequest Feedback() => new(4, "Explains decisions clearly", "Needs more cloud experience", "Proceed");

    private static async Task<(AppDbContext Db, Interview Interview, Employee Self, Employee Peer)> SeedAsync()
    {
        var db = TestFixture.CreateDb();
        var self = TestFixture.AddEmployee(db, "Self Interviewer", "self@example.test", "self");
        var peer = TestFixture.AddEmployee(db, "Peer Interviewer", "peer@example.test", "peer");
        var req = TestFixture.AddRequisition(db, self.EmployeeId, status: RequisitionStatuses.Published);
        TestFixture.AddTeamMember(db, req.RequisitionId, self.EmployeeId, TeamRoles.TechnicalInterviewer);
        TestFixture.AddTeamMember(db, req.RequisitionId, peer.EmployeeId, TeamRoles.FinalInterviewer);
        var stage = new PipelineStage { Name = "Interview", SortOrder = 4 };
        var candidate = new Candidate { FullName = "Candidate", Email = "candidate@example.test", Phone = "+12025550101" };
        db.PipelineStages.Add(stage);
        db.Candidates.Add(candidate);
        var application = new Application { RequisitionId = req.RequisitionId, CandidateId = candidate.CandidateId, PipelineStageId = stage.PipelineStageId };
        db.Applications.Add(application);
        var interview = new Interview { ApplicationId = application.ApplicationId, InterviewType = "Technical", Mode = "Video", ScheduledAt = DateTime.UtcNow.AddDays(1), Status = "Scheduled" };
        interview.PanelMembers.Add(new InterviewPanelMember { EmployeeId = self.EmployeeId });
        interview.PanelMembers.Add(new InterviewPanelMember { EmployeeId = peer.EmployeeId });
        db.Interviews.Add(interview);
        await db.SaveChangesAsync();
        return (db, interview, self, peer);
    }
}
