using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Tests;

/// <summary>
/// Documents current phone matching behavior for talent-pool search/duplicates.
/// </summary>
public class CandidatePhoneVariantTests
{
    [Fact]
    public async Task DuplicateCheck_E164Input_MatchesStoredE164()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(
            phone: CandidateTestHelpers.SampleE164Phone));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync(
            email: null,
            phone: CandidateTestHelpers.SampleE164Phone);

        Assert.True(result.IsDuplicate);
    }

    [Fact]
    public async Task Search_ByE164_FindsCandidate()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(new Candidate
        {
            CandidateId = Guid.NewGuid(),
            FullName = "Phone Match",
            Email = "phone@example.com",
            Phone = CandidateTestHelpers.SampleE164Phone
        });
        await db.SaveChangesAsync();

        var hits = await service.SearchAsync(CandidateTestHelpers.SampleE164Phone);

        Assert.Contains(hits, c => c.Phone == CandidateTestHelpers.SampleE164Phone);
    }

    [Fact]
    public async Task Search_ByLocalDigits_DoesNotFindStoredE164()
    {
        // Why GetPhoneVariants matters:
        // Stored phone is +923001234567.
        // Search "03001234567" cannot normalize without a country code, so
        // NormalizePhone returns null and GetPhoneVariants is empty.
        // Fallback digit Contains("03001234567") also fails because "+923001234567"
        // does not contain the leading trunk "0".
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(new Candidate
        {
            CandidateId = Guid.NewGuid(),
            FullName = "Phone Match",
            Email = "phone@example.com",
            Phone = CandidateTestHelpers.SampleE164Phone
        });
        await db.SaveChangesAsync();

        var hits = await service.SearchAsync(CandidateTestHelpers.SampleLocalPhone);

        Assert.DoesNotContain(hits, c => c.Phone == CandidateTestHelpers.SampleE164Phone);
    }

    [Fact]
    public async Task DuplicateCheck_LegacyLocalStoredPhone_MissesE164Input()
    {
        // Legacy row stored before E.164 migration.
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(
            email: "legacy@example.com",
            phone: CandidateTestHelpers.SampleLocalPhone));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync(
            email: null,
            phone: CandidateTestHelpers.SampleE164Phone);

        // Variants are +923..., 923..., 00923... — none equal "03001234567".
        Assert.False(result.IsDuplicate);
    }
}
