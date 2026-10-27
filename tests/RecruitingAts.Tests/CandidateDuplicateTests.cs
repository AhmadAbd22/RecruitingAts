using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-CAND-003 — duplicate detection by email and phone (talent-pool E.164 rules).
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

        var result = await service.FindDuplicatesAsync(
            "ada@example.com",
            phone: null);

        Assert.True(result.IsDuplicate);
        Assert.Single(result.Matches);
        Assert.Equal("ada@example.com", result.Matches[0].Email);
    }

    [Fact]
    public async Task SamePhone_LocalInput_MatchesStoredE164()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(
            email: "other@example.com",
            phone: CandidateTestHelpers.SampleE164Phone));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync(
            email: "new@example.com",
            phone: CandidateTestHelpers.SampleLocalPhone,
            phoneCountry: CandidateTestHelpers.SampleCountry);

        Assert.True(result.IsDuplicate);
        Assert.Single(result.Matches);
        Assert.Equal(CandidateTestHelpers.SampleE164Phone, result.Matches[0].Phone);
    }

    [Fact]
    public async Task Create_WhenDuplicateEmail_DoesNotSave()
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
        Assert.Empty(files.Saved); // duplicate short-circuits before resume save
    }

    [Fact]
    public async Task Create_UniqueCandidate_NormalizesPhoneToE164()
    {
        var (db, service, files) = CandidateTestHelpers.CreateSut();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, duplicate, error) = await service.CreateAsync(
            CandidateTestHelpers.CreateRequest(
                email: " ada@Example.com ",
                phone: "(0300) 123-4567"),
            pdf,
            "resume.pdf");

        Assert.Null(error);
        Assert.Null(duplicate);
        Assert.NotNull(detail);
        Assert.Equal("ada@example.com", detail.Email);
        Assert.Equal(CandidateTestHelpers.SampleE164Phone, detail.Phone);
        Assert.True(detail.HasResume);
        Assert.Single(files.Saved);
        Assert.Equal(1, await db.Candidates.CountAsync());
    }

    [Fact]
    public async Task Create_InvalidLocalPhoneWithoutCountry_Fails()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();

        await using var pdf = CandidateTestHelpers.MinimalPdf();
        var (detail, duplicate, error) = await service.CreateAsync(
            CandidateTestHelpers.CreateRequest(
                phone: CandidateTestHelpers.SampleLocalPhone,
                phoneCountry: null),
            pdf,
            "resume.pdf");

        Assert.Null(detail);
        Assert.Null(duplicate);
        Assert.Contains("valid phone number", error);
        Assert.Empty(db.Candidates);
    }
}
