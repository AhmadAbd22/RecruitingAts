using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Storage;
using System.ComponentModel.DataAnnotations;
using Microsoft.Data.SqlClient;
using PhoneNumbers;

namespace RecruitingAts.Api.Services;

public class CandidateService(AppDbContext db, IFileStorage files)
{
    public bool IsPhoneValid(string? phone)
    {
        return NormalizePhone(phone) != null;
    }
    public async Task<IReadOnlyList<CandidateListItem>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var candidates = db.Candidates
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim().ToLowerInvariant();

            var phoneVariants = GetPhoneVariants(
                NormalizePhone(term));

            var phoneDigits = Regex.IsMatch(
                term,
                @"^\+?[0-9()\s.-]+$")
                    ? Regex.Replace(term, @"[^0-9]", string.Empty)
                    : string.Empty;

            var internationalDigits = phoneDigits;

            if (phoneDigits.StartsWith("00"))
            {
                internationalDigits = phoneDigits[2..];
            }
            else if (phoneDigits.StartsWith("0"))
            {
                internationalDigits = "92" + phoneDigits[1..];
            }

            candidates = candidates.Where(c =>
                c.FullName.ToLower().Contains(term)
                || c.Email.ToLower().Contains(term)
                || phoneVariants.Contains(c.Phone)
                || (phoneDigits != ""
                    && c.Phone.Contains(phoneDigits))
                || (internationalDigits != ""
                    && c.Phone.Contains(internationalDigits)));
        }

        return await candidates
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
        string? email,
        string? phone,
        Guid? excludeCandidateId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(
            email ?? string.Empty);

        var normalizedPhone = NormalizePhone(phone);
        var phoneVariants = GetPhoneVariants(normalizedPhone);

        if (normalizedEmail.Length == 0 && phoneVariants.Length == 0)
        {
            return new DuplicateCheckResult(
                false,
                Array.Empty<CandidateListItem>());
        }

        var matches = await db.Candidates
            .AsNoTracking()
            .Where(c =>
                (!excludeCandidateId.HasValue
                    || c.CandidateId != excludeCandidateId)
                &&
                (
                    (normalizedEmail != ""
                        && c.Email.ToLower() == normalizedEmail)
                    ||
                    phoneVariants.Contains(c.Phone)
                ))
            .Select(c => new CandidateListItem(
                c.CandidateId,
                c.FullName,
                c.Email,
                c.Phone,
                c.Source,
                c.ResumePath != null))
            .ToListAsync(cancellationToken);

        return new DuplicateCheckResult(
            matches.Count > 0,
            matches);
    }

public async Task<(
    CandidateDetail? Detail,
    DuplicateCheckResult? Duplicate,
    string? Error)> CreateAsync(
        CreateCandidateRequest request,
        Stream resumeContent,
        string resumeFileName,
        CancellationToken cancellationToken = default)
{
    if (string.IsNullOrWhiteSpace(request.FullName)
        || string.IsNullOrWhiteSpace(request.Email)
        || string.IsNullOrWhiteSpace(request.Phone))
    {
        return (
            null,
            null,
            "Full name, email, and phone are required.");
    }

    var email = NormalizeEmail(request.Email);
    var phone = NormalizePhone(request.Phone);

    if (phone is null)
    {
        return (
            null,
            null,
            "Enter a valid phone number, such as "
            + "03123456789 or +923123456789.");
    }

    var duplicates = await FindDuplicatesAsync(
        email,
        phone,
        cancellationToken: cancellationToken);

    if (duplicates.IsDuplicate)
    {
        return (null, duplicates, null);
    }

    string resumePath;

    try
    {
        resumePath = await files.SaveAsync(
            resumeContent,
            resumeFileName,
            cancellationToken);
    }
    catch (InvalidOperationException ex)
    {
        return (null, null, ex.Message);
    }

    var candidate = new Candidate
    {
        CandidateId = Guid.NewGuid(),
        FullName = request.FullName.Trim(),
        Email = email,
        Phone = phone,

        Skills = string.IsNullOrWhiteSpace(request.Skills)
            ? null
            : request.Skills.Trim(),

        Source = string.IsNullOrWhiteSpace(request.Source)
            ? null
            : request.Source.Trim(),

        ConsentDate = request.ConsentDate,
        ResumePath = resumePath,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Candidates.Add(candidate);

    try
    {
        await db.SaveChangesAsync(cancellationToken);
    }
    catch (DbUpdateException ex) when (
        ex.InnerException is SqlException sqlException
        && (sqlException.Number == 2601
            || sqlException.Number == 2627))
    {
        db.Entry(candidate).State = EntityState.Detached;

        await files.DeleteAsync(
            resumePath,
            CancellationToken.None);

        duplicates = await FindDuplicatesAsync(
            email,
            phone,
            cancellationToken: cancellationToken);

        if (!duplicates.IsDuplicate)
        {
            throw;
        }

        return (null, duplicates, null);
    }
    catch
    {
        await files.DeleteAsync(
            resumePath,
            CancellationToken.None);

        throw;
    }

    return (ToDetail(candidate), null, null);
}

    public async Task<(CandidateDetail? Detail, string? Error)> AttachResumeAsync(
        Guid candidateId,
        Stream content,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates.FirstOrDefaultAsync(
            c => c.CandidateId == candidateId,
            cancellationToken);

        if (candidate is null)
        {
            return (null, "Candidate not found.");
        }

        string newResumePath;

        try
        {
            newResumePath = await files.SaveAsync(
                content,
                fileName,
                cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return (null, ex.Message);
        }

        var previousResumePath = candidate.ResumePath;

        candidate.ResumePath = newResumePath;
        candidate.UpdatedAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await files.DeleteAsync(
                newResumePath,
                CancellationToken.None);

            throw;
        }

        if (!string.IsNullOrEmpty(previousResumePath))
        {
            await files.DeleteAsync(
                previousResumePath,
                cancellationToken);
        }

        return (ToDetail(candidate), null);
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


    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var compact = Regex.Replace(
            phone.Trim(),
            @"[\s().-]",
            string.Empty);

        if (!Regex.IsMatch(compact, @"^\+?[0-9]+$"))
        {
            return null;
        }

        var phoneUtil = PhoneNumberUtil.GetInstance();

        try
        {
            var parsed = phoneUtil.Parse(compact, "PK");

            if (!phoneUtil.IsValidNumber(parsed))
            {
                return null;
            }

            var normalized = phoneUtil.Format(
                parsed,
                PhoneNumberFormat.E164);

            if (normalized.Length - 1 > 15)
            {
                return null;
            }

            return normalized;
        }
        catch (NumberParseException)
        {
            return null;
        }
    }

    private static string[] GetPhoneVariants(string? normalizedPhone)
    {
        if (normalizedPhone is null)
        {
            return Array.Empty<string>();
        }

        var digits = normalizedPhone.Substring(1);

        var variants = new List<string>
    {
        normalizedPhone,
        digits,
        "00" + digits
    };

        if (normalizedPhone.StartsWith(
            "+92",
            StringComparison.Ordinal))
        {
            variants.Add("0" + digits.Substring(2));
        }

        return variants.ToArray();
    }

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
    [Required, StringLength(200)]
    string FullName,

    [Required, EmailAddress, StringLength(256)]
    string Email,

    [Required, StringLength(
    15,
    ErrorMessage = "Phone cannot exceed 15 characters.")]
    string Phone,

    [StringLength(1000)]
    string? Skills,

    [StringLength(100)]
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

public record DuplicateCheckRequest(
    [EmailAddress, StringLength(256)]
    string? Email,

    [StringLength(
        15,
        ErrorMessage = "Phone cannot exceed 15 characters.")]
    string? Phone);

public record DuplicateCheckResult(
    bool IsDuplicate,
    IReadOnlyList<CandidateListItem> Matches);

