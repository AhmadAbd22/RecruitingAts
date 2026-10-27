using Microsoft.EntityFrameworkCore;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-CAND-003 — duplicate detection (E.164 + required source on create).
/// </summary>
public class CandidateDuplicateTests
{
    [Fact]
    public async Task SameEmail_IsDetectedAsDuplicate()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(
            email: "ada@example.com",
            phone: "+923111111111"));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync("ada@example.com", phone: null);

        Assert.True(result.IsDuplicate);
        Assert.Single(result.Matches);
    }

    [Fact]
    public async Task SamePhone_LocalInput_MatchesStoredE164()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(
            phone: CandidateTestHelpers.SampleE164Phone));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync(
            email: "new@example.com",
            phone: CandidateTestHelpers.SampleLocalPhone,
            phoneCountry: CandidateTestHelpers.SampleCountry);

        Assert.True(result.IsDuplicate);
        Assert.Equal(CandidateTestHelpers.SampleE164Phone, result.Matches[0].Phone);
    }

    [Fact]
    public async Task Create_WhenDuplicate_DoesNotSaveOrUploadResume()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(email: "ada@example.com"));
        await db.SaveChangesAsync();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, duplicate, error) = await service.CreateAsync(
            CandidateTestHelpers.CreateRequest(email: "ada@example.com", phone: "03009876543"),
            pdf,
            "resume.pdf");

        Assert.Null(detail);
        Assert.Null(error);
        Assert.NotNull(duplicate);
        Assert.True(duplicate.IsDuplicate);
        Assert.Equal(1, await db.Candidates.CountAsync());
        Assert.Empty(files.Saved);
    }

    [Fact]
    public async Task Create_UniqueCandidate_NormalizesPhoneAndRequiresSource()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, duplicate, error) = await service.CreateAsync(
            CandidateTestHelpers.CreateRequest(
                email: " ada@Example.com ",
                phone: "(0300) 123-4567",
                source: " LinkedIn "),
            pdf,
            "resume.pdf");

        Assert.Null(error);
        Assert.Null(duplicate);
        Assert.NotNull(detail);
        Assert.Equal("ada@example.com", detail.Email);
        Assert.Equal(CandidateTestHelpers.SampleE164Phone, detail.Phone);
        Assert.Equal("LinkedIn", detail.Source);
        Assert.True(detail.HasResume);
        Assert.Single(files.Saved);
    }

    [Fact]
    public async Task Create_BlankSource_Fails()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, duplicate, error) = await service.CreateAsync(
            CandidateTestHelpers.CreateRequest(source: "   "),
            pdf,
            "resume.pdf");

        Assert.Null(detail);
        Assert.Null(duplicate);
        Assert.Equal("Candidate source is required.", error);
        Assert.Empty(db.Candidates);
    }

    [Fact]
    public async Task Create_LocalPhoneWithoutCountry_Fails()
    {
        var (_, service, _) = CandidateTestHelpers.CreateSut();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, duplicate, error) = await service.CreateAsync(
            CandidateTestHelpers.CreateRequest(phoneCountry: null),
            pdf,
            "resume.pdf");

        Assert.Null(detail);
        Assert.Null(duplicate);
        Assert.Contains("valid phone number", error);
    }
}
