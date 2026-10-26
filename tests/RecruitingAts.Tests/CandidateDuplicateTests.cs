using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Services;
using RecruitingAts.Api.Storage;

namespace RecruitingAts.Tests;

/// <summary>
/// FR-CAND-003 — duplicate detection by email and phone.
/// </summary>
public class CandidateDuplicateTests
{
    [Fact]
    public async Task SameEmail_IsDetectedAsDuplicate()
    {
        var (db, service) = CreateSut();
        db.Candidates.Add(ExistingCandidate(email: "ada@example.com", phone: "1111111111"));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync("ada@example.com", "9999999999");

        Assert.True(result.IsDuplicate);
        Assert.Single(result.Matches);
        Assert.Equal("ada@example.com", result.Matches[0].Email);
    }

    [Fact]
    public async Task SamePhone_IsDetectedAsDuplicate()
    {
        var (db, service) = CreateSut();
        db.Candidates.Add(ExistingCandidate(email: "other@example.com", phone: "1234567890"));
        await db.SaveChangesAsync();

        var result = await service.FindDuplicatesAsync("new@example.com", "1234567890");

        Assert.True(result.IsDuplicate);
        Assert.Single(result.Matches);
        Assert.Equal("1234567890", result.Matches[0].Phone);
    }

    [Fact]
    public async Task CreateWithoutConfirm_WhenDuplicate_DoesNotSave()
    {
        var (db, service) = CreateSut();
        db.Candidates.Add(ExistingCandidate(email: "ada@example.com", phone: "1111111111"));
        await db.SaveChangesAsync();

        var request = new CreateCandidateRequest(
            FullName: "Ada Two",
            Email: "ada@example.com",
            Phone: "2222222222",
            Skills: null,
            Source: null,
            ConsentDate: null);

        var (detail, duplicate, error) = await service.CreateAsync(request, confirmDuplicate: false);

        Assert.Null(detail);
        Assert.Null(error);
        Assert.NotNull(duplicate);
        Assert.True(duplicate.IsDuplicate);
        Assert.Equal(1, await db.Candidates.CountAsync());
    }

    [Fact]
    public async Task Create_UniqueCandidate_Succeeds()
    {
        var (db, service) = CreateSut();

        var (detail, duplicate, error) = await service.CreateAsync(
            new CreateCandidateRequest(
                FullName: "Ada Lovelace",
                Email: " ada@Example.com ",
                Phone: "(0300) 123-4567",
                Skills: "Math",
                Source: "Referral",
                ConsentDate: DateTime.UtcNow.Date),
            confirmDuplicate: false);

        Assert.Null(error);
        Assert.Null(duplicate);
        Assert.NotNull(detail);
        Assert.Equal("ada@example.com", detail.Email);
        Assert.Equal("03001234567", detail.Phone);
        Assert.Equal(1, await db.Candidates.CountAsync());
    }

    [Fact]
    public async Task Create_ConfirmDuplicate_StillBlockedWhenEmailExists()
    {
        var (db, service) = CreateSut();
        db.Candidates.Add(ExistingCandidate(email: "ada@example.com", phone: "1111111111"));
        await db.SaveChangesAsync();

        var (detail, duplicate, error) = await service.CreateAsync(
            new CreateCandidateRequest(
                FullName: "Ada Two",
                Email: "ada@example.com",
                Phone: "9999999999",
                Skills: null,
                Source: null,
                ConsentDate: null),
            confirmDuplicate: true);

        Assert.Null(detail);
        Assert.NotNull(duplicate);
        Assert.Equal("A candidate with this email already exists. Use the existing record.", error);
        Assert.Equal(1, await db.Candidates.CountAsync());
    }

    private static (AppDbContext Db, CandidateService Service) CreateSut()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);
        return (db, new CandidateService(db, new NoOpFileStorage()));
    }

    private static Candidate ExistingCandidate(string email, string phone) => new()
    {
        CandidateId = Guid.NewGuid(),
        FullName = "Existing Candidate",
        Email = email,
        Phone = phone
    };

    private sealed class NoOpFileStorage : IFileStorage
    {
        public Task<string> SaveAsync(Stream content, string fileName, CancellationToken cancellationToken = default) =>
            Task.FromResult("noop.pdf");

        public Task<Stream?> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default) =>
            Task.FromResult<Stream?>(null);

        public Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}
