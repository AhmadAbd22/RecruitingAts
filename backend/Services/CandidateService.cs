using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Storage;

namespace RecruitingAts.Api.Services;

public class CandidateService(AppDbContext db, IFileStorage files)
{
    public async Task<IReadOnlyList<CandidateListItem>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var q = db.Candidates.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim().ToLowerInvariant();
            q = q.Where(c =>
                c.FullName.ToLower().Contains(term)
                || c.Email.ToLower().Contains(term)
                || c.Phone.Contains(term));
        }

        return await q
            .OrderBy(c => c.FullName)
            .Take(100)
            .Select(c => new CandidateListItem(
                c.CandidateId,
                c.FullName,
                c.Email,
                c.Phone,
                c.Source,
                c.ResumePath != null))
            .ToListAsync(cancellationToken);
    }

    public async Task<CandidateDetail?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var c = await db.Candidates.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CandidateId == id, cancellationToken);
        return c is null ? null : ToDetail(c);
    }

    public async Task<DuplicateCheckResult> FindDuplicatesAsync(
        string email,
        string phone,
        Guid? excludeCandidateId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var normalizedPhone = NormalizePhone(phone);

        var matches = await db.Candidates.AsNoTracking()
            .Where(c =>
                (!excludeCandidateId.HasValue || c.CandidateId != excludeCandidateId)
                && (c.Email.ToLower() == normalizedEmail
                    || c.Phone == normalizedPhone))
            .Select(c => new CandidateListItem(
                c.CandidateId,
                c.FullName,
                c.Email,
                c.Phone,
                c.Source,
                c.ResumePath != null))
            .ToListAsync(cancellationToken);

        return new DuplicateCheckResult(matches.Count > 0, matches);
    }

    public async Task<(CandidateDetail? Detail, DuplicateCheckResult? Duplicate, string? Error)> CreateAsync(
        CreateCandidateRequest request,
        bool confirmDuplicate,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FullName)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Phone))
        {
            return (null, null, "Full name, email, and phone are required.");
        }

        var email = NormalizeEmail(request.Email);
        var phone = NormalizePhone(request.Phone);
        if (phone.Length < 7)
        {
            return (null, null, "Phone number looks invalid.");
        }

        var duplicates = await FindDuplicatesAsync(email, phone, cancellationToken: cancellationToken);
        if (duplicates.IsDuplicate && !confirmDuplicate)
        {
            return (null, duplicates, null);
        }

        if (await db.Candidates.AnyAsync(c => c.Email.ToLower() == email, cancellationToken))
        {
            return (null, duplicates, "A candidate with this email already exists. Use the existing record.");
        }

        if (await db.Candidates.AnyAsync(c => c.Phone == phone, cancellationToken))
        {
            return (null, duplicates, "A candidate with this phone already exists. Use the existing record.");
        }

        var candidate = new Candidate
        {
            CandidateId = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = phone,
            Skills = string.IsNullOrWhiteSpace(request.Skills) ? null : request.Skills.Trim(),
            Source = string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim(),
            ConsentDate = request.ConsentDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Candidates.Add(candidate);
        await db.SaveChangesAsync(cancellationToken);
        return (ToDetail(candidate), null, null);
    }

    public async Task<(CandidateDetail? Detail, string? Error)> AttachResumeAsync(
        Guid candidateId,
        Stream content,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates.FirstOrDefaultAsync(c => c.CandidateId == candidateId, cancellationToken);
        if (candidate is null)
        {
            return (null, "Candidate not found.");
        }

        try
        {
            if (!string.IsNullOrEmpty(candidate.ResumePath))
            {
                await files.DeleteAsync(candidate.ResumePath, cancellationToken);
            }

            candidate.ResumePath = await files.SaveAsync(content, fileName, cancellationToken);
            candidate.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return (ToDetail(candidate), null);
        }
        catch (InvalidOperationException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(Stream? Stream, string? FileName, string? Error)> OpenResumeAsync(
        Guid candidateId,
        CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates.AsNoTracking()
            .FirstOrDefaultAsync(c => c.CandidateId == candidateId, cancellationToken);
        if (candidate is null)
        {
            return (null, null, "Candidate not found.");
        }

        if (string.IsNullOrEmpty(candidate.ResumePath))
        {
            return (null, null, "No résumé uploaded.");
        }

        var stream = await files.OpenReadAsync(candidate.ResumePath, cancellationToken);
        if (stream is null)
        {
            return (null, null, "Résumé file missing on disk.");
        }

        return (stream, $"{candidate.FullName}.pdf", null);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string NormalizePhone(string phone) =>
        Regex.Replace(phone, @"\D", string.Empty);

    private static CandidateDetail ToDetail(Candidate c) =>
        new(
            c.CandidateId,
            c.FullName,
            c.Email,
            c.Phone,
            c.Skills,
            c.Source,
            c.ConsentDate,
            c.ResumePath != null,
            c.CreatedAt);
}

public record CreateCandidateRequest(
    string FullName,
    string Email,
    string Phone,
    string? Skills,
    string? Source,
    DateTime? ConsentDate);

public record CandidateListItem(
    Guid CandidateId,
    string FullName,
    string Email,
    string Phone,
    string? Source,
    bool HasResume);

public record CandidateDetail(
    Guid CandidateId,
    string FullName,
    string Email,
    string Phone,
    string? Skills,
    string? Source,
    DateTime? ConsentDate,
    bool HasResume,
    DateTime CreatedAt);

public record DuplicateCheckResult(
    bool IsDuplicate,
    IReadOnlyList<CandidateListItem> Matches);
