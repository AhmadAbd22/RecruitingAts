using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

public class CandidateDuplicatePolicyTests
{
    private static AppDbContext CreateDb() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static CandidateService Service(AppDbContext db) => new(
        db, new CandidateTestHelpers.RecordingFileStorage(), NullLogger<CandidateService>.Instance);

    private static Candidate Existing(string email = "ali@example.test", string phone = "+923001234567") => new()
    {
        CandidateId = Guid.NewGuid(), FullName = "Ali", Email = email,
        Phone = phone, Source = "Referral"
    };

    private static CreateCandidateRequest Request(string email, string phone) => new(
        "Another candidate", email, phone, null, "Referral", null);

    [Theory]
    [InlineData("ali@example.test", "+12025550171")]
    [InlineData("new@example.test", "+923001234567")]
    public async Task OneMatchingField_WarnsAndRequiresAcknowledgement(string email, string phone)
    {
        await using var db = CreateDb();
        db.Candidates.Add(Existing());
        await db.SaveChangesAsync();
        var service = Service(db);

        var check = await service.FindDuplicatesAsync(email, phone);
        Assert.True(check.IsDuplicate);
        Assert.False(check.IsHardDuplicate);
        Assert.True(check.CanCreateAnyway);
        Assert.Equal(email == "ali@example.test", check.MatchesEmail);
        Assert.Equal(phone == "+923001234567", check.MatchesPhone);

        var unconfirmed = await CreateWithPdf(service, Request(email, phone));
        Assert.Null(unconfirmed.Detail);
        Assert.NotNull(unconfirmed.Duplicate);
        Assert.Single(db.Candidates);

        var confirmed = await CreateWithPdf(service, Request(email, phone), confirmDuplicate: true);
        Assert.NotNull(confirmed.Detail);
        Assert.True(confirmed.Detail.HasResume);
        Assert.Equal(2, await db.Candidates.CountAsync());
    }

    [Theory]
    [InlineData("+923001234567")]
    [InlineData("923001234567")]
    [InlineData("00923001234567")]
    [InlineData("03001234567")]
    [InlineData("3001234567")]
    public async Task BothFieldsMatch_AlwaysBlocksEvenWithAcknowledgement(string storedPhone)
    {
        await using var db = CreateDb();
        db.Candidates.Add(Existing(phone: storedPhone));
        await db.SaveChangesAsync();
        var result = await CreateWithPdf(Service(db),
            Request(" ALI@EXAMPLE.TEST ", "+923001234567"), confirmDuplicate: true);

        Assert.Null(result.Detail);
        Assert.True(result.Duplicate!.IsHardDuplicate);
        Assert.True(result.Duplicate.MatchesEmail);
        Assert.True(result.Duplicate.MatchesPhone);
        Assert.False(result.Duplicate.CanCreateAnyway);
        Assert.Single(db.Candidates);
    }

    [Fact]
    public async Task DifferentEmailAndPhone_CreatesWithoutAcknowledgement()
    {
        await using var db = CreateDb();
        db.Candidates.Add(Existing());
        await db.SaveChangesAsync();
        var result = await CreateWithPdf(Service(db), Request("new@example.test", "+12025550171"));

        Assert.NotNull(result.Detail);
        Assert.Null(result.Duplicate);
        Assert.Equal(2, await db.Candidates.CountAsync());
    }

    [Fact]
    public async Task EmailAndPhoneMatchDifferentPeople_IsAWarning()
    {
        await using var db = CreateDb();
        db.Candidates.AddRange(Existing(), Existing("sara@example.test", "+12025550171"));
        await db.SaveChangesAsync();
        var service = Service(db);
        var result = await service.FindDuplicatesAsync("ali@example.test", "+12025550171");

        Assert.Equal(2, result.Matches.Count);
        Assert.True(result.CanCreateAnyway);
        Assert.False(result.IsHardDuplicate);
        Assert.True(result.MatchesEmail);
        Assert.True(result.MatchesPhone);
        var created = await CreateWithPdf(service, Request("ali@example.test", "+12025550171"), true);
        Assert.NotNull(created.Detail);
    }

    private static async Task<(CandidateDetail? Detail, DuplicateCheckResult? Duplicate, string? Error)> CreateWithPdf(
        CandidateService service, CreateCandidateRequest request, bool confirmDuplicate = false)
    {
        await using var pdf = CandidateTestHelpers.MinimalPdf();
        return await service.CreateAsync(request, pdf, "resume.pdf", confirmDuplicate);
    }
}
