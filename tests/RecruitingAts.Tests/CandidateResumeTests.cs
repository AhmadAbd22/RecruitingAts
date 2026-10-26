using Microsoft.EntityFrameworkCore;

namespace RecruitingAts.Tests;

/// <summary>
/// Resume attach/replace behavior for talent-pool candidates.
/// </summary>
public class CandidateResumeTests
{
    [Fact]
    public async Task AttachResume_ReplacesPreviousAndDeletesOldFile()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();
        var candidate = CandidateTestHelpers.ExistingCandidate(resumePath: "old.pdf");
        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();

        await using var pdf = CandidateTestHelpers.MinimalPdf("new");
        var (detail, error) = await service.AttachResumeAsync(
            candidate.CandidateId,
            pdf,
            "new-resume.pdf");

        Assert.Null(error);
        Assert.NotNull(detail);
        Assert.True(detail.HasResume);
        Assert.Single(files.Saved);
        Assert.Contains("old.pdf", files.Deleted);

        var stored = await db.Candidates.SingleAsync();
        Assert.Equal(files.Saved[0], stored.ResumePath);
    }

    [Fact]
    public async Task AttachResume_WhenSaveFails_LeavesCandidateUnchanged()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();
        files.ThrowOnSave = true;
        var candidate = CandidateTestHelpers.ExistingCandidate(resumePath: "old.pdf");
        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, error) = await service.AttachResumeAsync(
            candidate.CandidateId,
            pdf,
            "bad.txt");

        Assert.Null(detail);
        Assert.Equal("Only PDF files are allowed.", error);
        Assert.Equal("old.pdf", (await db.Candidates.SingleAsync()).ResumePath);
        Assert.Empty(files.Deleted);
    }
}
