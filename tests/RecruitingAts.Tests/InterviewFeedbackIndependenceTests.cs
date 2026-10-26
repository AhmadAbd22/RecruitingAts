using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-INT-006 / FR-INT-007 — one submission per interviewer; feedback independence.
/// Interview service is not implemented yet; these tests lock the data rules that service must honor.
/// </summary>
public class InterviewFeedbackIndependenceTests
{
    [Fact]
    public async Task BeforeOwnSubmit_CannotSeePeersFeedback()
    {
        var (db, interviewId, selfId, peerId) = await SeedInterviewAsync();
        db.InterviewFeedbacks.Add(Feedback(interviewId, peerId, rating: 4));
        await db.SaveChangesAsync();

        var visible = await VisibleFeedbackAsync(db, interviewId, selfId);

        Assert.Empty(visible);
    }

    [Fact]
    public async Task AfterOwnSubmit_CanSeePeersFeedback()
    {
        var (db, interviewId, selfId, peerId) = await SeedInterviewAsync();
        db.InterviewFeedbacks.Add(Feedback(interviewId, peerId, rating: 4));
        db.InterviewFeedbacks.Add(Feedback(interviewId, selfId, rating: 5));
        await db.SaveChangesAsync();

        var visible = await VisibleFeedbackAsync(db, interviewId, selfId);

        Assert.Equal(2, visible.Count);
        Assert.Contains(visible, f => f.InterviewerEmployeeId == peerId);
        Assert.Contains(visible, f => f.InterviewerEmployeeId == selfId);
    }

    [Fact]
    public async Task SecondSubmission_BySameInterviewer_Fails()
    {
        var (db, interviewId, selfId, _) = await SeedInterviewAsync();
        db.InterviewFeedbacks.Add(Feedback(interviewId, selfId, rating: 3));
        await db.SaveChangesAsync();

        var (ok, error) = await TrySubmitAsync(db, interviewId, selfId, rating: 5);

        Assert.False(ok);
        Assert.Equal("Feedback already submitted for this interview.", error);
        Assert.Equal(1, await db.InterviewFeedbacks.CountAsync(f =>
            f.InterviewId == interviewId && f.InterviewerEmployeeId == selfId));
    }

    /// <summary>
    /// Encodes FR-INT-006: peers' feedback is hidden until the current interviewer has submitted.
    /// </summary>
    private static async Task<List<InterviewFeedback>> VisibleFeedbackAsync(
        AppDbContext db,
        Guid interviewId,
        Guid interviewerEmployeeId)
    {
        var ownSubmitted = await db.InterviewFeedbacks.AnyAsync(f =>
            f.InterviewId == interviewId && f.InterviewerEmployeeId == interviewerEmployeeId);

        if (!ownSubmitted)
        {
            return [];
        }

        return await db.InterviewFeedbacks
            .AsNoTracking()
            .Where(f => f.InterviewId == interviewId)
            .ToListAsync();
    }

    /// <summary>
    /// Encodes FR-INT-007: one feedback row per interviewer per interview.
    /// </summary>
    private static async Task<(bool Ok, string? Error)> TrySubmitAsync(
        AppDbContext db,
        Guid interviewId,
        Guid interviewerEmployeeId,
        int rating)
    {
        var exists = await db.InterviewFeedbacks.AnyAsync(f =>
            f.InterviewId == interviewId && f.InterviewerEmployeeId == interviewerEmployeeId);
        if (exists)
        {
            return (false, "Feedback already submitted for this interview.");
        }

        db.InterviewFeedbacks.Add(Feedback(interviewId, interviewerEmployeeId, rating));
        await db.SaveChangesAsync();
        return (true, null);
    }

    private static async Task<(
        AppDbContext Db,
        Guid InterviewId,
        Guid SelfId,
        Guid PeerId)> SeedInterviewAsync()
    {
        var db = TestFixture.CreateDb();
        var hm = TestFixture.AddEmployee(db, "Hiring Manager", "hm@example.com");
        var self = TestFixture.AddEmployee(db, "Self Interviewer", "self@example.com", "self-user");
        var peer = TestFixture.AddEmployee(db, "Peer Interviewer", "peer@example.com", "peer-user");
        var req = TestFixture.AddRequisition(db, hm.EmployeeId, status: RequisitionStatuses.Published);

        var stage = new PipelineStage
        {
            PipelineStageId = Guid.NewGuid(),
            Name = PipelineStageNames.Interview,
            SortOrder = 3
        };
        db.PipelineStages.Add(stage);

        var candidate = new Candidate
        {
            CandidateId = Guid.NewGuid(),
            FullName = "Candidate",
            Email = "candidate@example.com",
            Phone = "03001234567"
        };
        db.Candidates.Add(candidate);

        var application = new Application
        {
            ApplicationId = Guid.NewGuid(),
            CandidateId = candidate.CandidateId,
            RequisitionId = req.RequisitionId,
            PipelineStageId = stage.PipelineStageId
        };
        db.Applications.Add(application);

        var interview = new Interview
        {
            InterviewId = Guid.NewGuid(),
            ApplicationId = application.ApplicationId,
            InterviewType = "Technical",
            Mode = "Video",
            ScheduledAt = DateTime.UtcNow.AddDays(1),
            Status = "Scheduled"
        };
        db.Interviews.Add(interview);
        db.InterviewPanelMembers.AddRange(
            new InterviewPanelMember
            {
                InterviewPanelMemberId = Guid.NewGuid(),
                InterviewId = interview.InterviewId,
                EmployeeId = self.EmployeeId
            },
            new InterviewPanelMember
            {
                InterviewPanelMemberId = Guid.NewGuid(),
                InterviewId = interview.InterviewId,
                EmployeeId = peer.EmployeeId
            });

        await db.SaveChangesAsync();
        return (db, interview.InterviewId, self.EmployeeId, peer.EmployeeId);
    }

    private static InterviewFeedback Feedback(Guid interviewId, Guid interviewerId, int rating) =>
        new()
        {
            InterviewFeedbackId = Guid.NewGuid(),
            InterviewId = interviewId,
            InterviewerEmployeeId = interviewerId,
            Rating = rating,
            Strengths = "Strengths",
            Concerns = "Concerns",
            Recommendation = "Hire"
        };
}
