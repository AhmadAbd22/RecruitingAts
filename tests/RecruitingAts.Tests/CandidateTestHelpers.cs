using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Services;
using RecruitingAts.Api.Storage;
using System.Text;

namespace RecruitingAts.Tests;

internal static class CandidateTestHelpers
{
    /// <summary>Valid PK mobile used across talent-pool tests (E.164: +923001234567).</summary>
    public const string SampleLocalPhone = "03001234567";
    public const string SampleE164Phone = "+923001234567";
    public const string SampleCountry = "PK";

    public static (AppDbContext Db, CandidateService Service, RecordingFileStorage Files) CreateSut()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);
        var files = new RecordingFileStorage();
        var service = new CandidateService(db, files, NullLogger<CandidateService>.Instance);
        return (db, service, files);
    }

    public static Candidate ExistingCandidate(
        string email = "existing@example.com",
        string phone = SampleE164Phone,
        string? resumePath = "existing.pdf") =>
        new()
        {
            CandidateId = Guid.NewGuid(),
            FullName = "Existing Candidate",
            Email = email,
            Phone = phone,
            ResumePath = resumePath
        };

    public static CreateCandidateRequest CreateRequest(
        string fullName = "Ada Lovelace",
        string email = "ada@example.com",
        string phone = SampleLocalPhone,
        string? phoneCountry = SampleCountry) =>
        new(
            FullName: fullName,
            Email: email,
            Phone: phone,
            Skills: null,
            Source: "Referral",
            ConsentDate: null,
            PhoneCountry: phoneCountry);

    public static MemoryStream MinimalPdf(string marker = "test")
    {
        // LocalFileStorage requires a %PDF- header; body can be tiny for unit tests.
        var bytes = Encoding.ASCII.GetBytes("%PDF-1.4\n" + marker + "\n%%EOF\n");
        return new MemoryStream(bytes);
    }

    internal sealed class RecordingFileStorage : IFileStorage
    {
        public List<string> Saved { get; } = [];
        public List<string> Deleted { get; } = [];
        public bool ThrowOnSave { get; set; }
        public string? ThrowOnDeletePath { get; set; }

        public Task<string> SaveAsync(
            Stream content,
            string fileName,
            CancellationToken cancellationToken = default)
        {
            if (ThrowOnSave)
            {
                throw new InvalidOperationException("Only PDF files are allowed.");
            }

            var name = $"{Guid.NewGuid():N}.pdf";
            Saved.Add(name);
            return Task.FromResult(name);
        }

        public Task<Stream?> OpenReadAsync(
            string relativePath,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<Stream?>(MinimalPdf(relativePath));

        public Task DeleteAsync(
            string relativePath,
            CancellationToken cancellationToken = default)
        {
            if (ThrowOnDeletePath == relativePath)
            {
                throw new IOException("locked");
            }

            Deleted.Add(relativePath);
            return Task.CompletedTask;
        }
    }
}
