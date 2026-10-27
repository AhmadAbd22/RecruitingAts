using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Tests;

/// <summary>
/// Phone search / duplicate matching across local and E.164 forms.
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
    public async Task DuplicateCheck_E164Input_MatchesLegacyLocalStoredPhone()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(CandidateTestHelpers.ExistingCandidate(
            email: "legacy@example.com",
            phone: CandidateTestHelpers.SampleLocalPhone));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync(
            email: null,
            phone: CandidateTestHelpers.SampleE164Phone);

        Assert.True(result.IsDuplicate);
        Assert.Equal(CandidateTestHelpers.SampleLocalPhone, result.Matches[0].Phone);
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
            Phone = CandidateTestHelpers.SampleE164Phone,
            Source = "Agency"
        });
        await db.SaveChangesAsync();

        var hits = await service.SearchAsync(CandidateTestHelpers.SampleE164Phone);

        Assert.Contains(hits, c => c.Phone == CandidateTestHelpers.SampleE164Phone);
    }

    [Fact]
    public async Task Search_ByLocalDigits_FindsStoredE164()
    {
        var (db, service, _) = CandidateTestHelpers.CreateSut();
        db.Candidates.Add(new Candidate
        {
            CandidateId = Guid.NewGuid(),
            FullName = "Phone Match",
            Email = "phone@example.com",
            Phone = CandidateTestHelpers.SampleE164Phone,
            Source = "Agency"
        });
        await db.SaveChangesAsync();

        var hits = await service.SearchAsync(CandidateTestHelpers.SampleLocalPhone);

        Assert.Contains(hits, c => c.Phone == CandidateTestHelpers.SampleE164Phone);
    }
}
