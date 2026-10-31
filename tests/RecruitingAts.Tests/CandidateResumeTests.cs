using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// Required-PDF creation and resume attach/replace behavior for talent-pool candidates.
/// </summary>
public class CandidateResumeTests
{
    [Fact]
    public async Task Create_WithoutResume_DoesNotSaveCandidate()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();
        var result = await service.CreateAsync(CandidateTestHelpers.CreateRequest(), null, null);

        Assert.Null(result.Detail);
        Assert.Equal("A PDF resume is required.", result.Error);
        Assert.Empty(db.Candidates);
        Assert.Empty(files.Saved);
    }

    [Fact]
    public async Task Create_WithEmptyResume_DoesNotSaveCandidate()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();
        await using var empty = new MemoryStream();
        var result = await service.CreateAsync(CandidateTestHelpers.CreateRequest(), empty, "resume.pdf");

        Assert.Null(result.Detail);
        Assert.Equal("A PDF resume is required.", result.Error);
        Assert.Empty(db.Candidates);
        Assert.Empty(files.Saved);
    }

    [Fact]
    public async Task Create_WhenResumeIsRejected_DoesNotSaveCandidate()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();
        files.ThrowOnSave = true;
        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var result = await service.CreateAsync(CandidateTestHelpers.CreateRequest(), pdf, "resume.txt");

        Assert.Null(result.Detail);
        Assert.Equal("Only PDF files are allowed.", result.Error);
        Assert.Empty(db.Candidates);
        Assert.Empty(files.Saved);
    }

    [Fact]
    public async Task Create_WhenDatabaseSaveFails_DeletesNewResume()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new RejectSave()).Options);
        var files = new CandidateTestHelpers.RecordingFileStorage();
        var service = new CandidateService(db, files, NullLogger<CandidateService>.Instance);
        await using var pdf = CandidateTestHelpers.MinimalPdf();

        await Assert.ThrowsAsync<DbUpdateException>(() => service.CreateAsync(
            CandidateTestHelpers.CreateRequest(), pdf, "resume.pdf"));

        Assert.Single(files.Saved);
        Assert.Contains(files.Saved[0], files.Deleted);
        Assert.Empty(await db.Candidates.AsNoTracking().ToListAsync());
    }

    private sealed class RejectSave : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
            => throw new DbUpdateException("Synthetic database failure.");
    }

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
