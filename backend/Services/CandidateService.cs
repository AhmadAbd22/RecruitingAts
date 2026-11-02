using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Storage;
using System.ComponentModel.DataAnnotations;
using Microsoft.Data.SqlClient;
using PhoneNumbers;

namespace RecruitingAts.Api.Services;

public class CandidateService(
    AppDbContext db,
    IFileStorage files,
    ILogger<CandidateService> logger)
{
    public bool IsPhoneValid(
    string? phone,
    string? phoneCountry = null)
    {
        return NormalizePhone(phone, phoneCountry) != null;
    }
    public async Task<IReadOnlyList<CandidateListItem>> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var candidates = db.Candidates.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query))
        {
            // Example search query: "0300 123-4567"
            var term = query.Trim().ToLowerInvariant();
            // term → "0300 123-4567"

            // Without a country code this returns null for local numbers.
            // "+923001234567" would normalize; "0300 123-4567" alone does not.
            var normalizedPhone = NormalizePhone(term);
            var phoneVariants = GetPhoneVariants(normalizedPhone);

            // Keep digits only from a phone-like query: "0300 123-4567" → "03001234567"
            var phoneDigits = Regex.IsMatch(
                term,
                @"^\+?[0-9()\s.-]+$")
                    ? Regex.Replace(term, @"[^0-9]", string.Empty)
                    : string.Empty;

            // Drop leading trunk zeros: "03001234567" → "3001234567"
            // Those digits appear inside stored E.164 "+923001234567".
            var significantDigits = phoneDigits.TrimStart('0');

            candidates = candidates.Where(c =>
                c.FullName.ToLower().Contains(term)
                || c.Email.ToLower().Contains(term)
                // Exact match against any known form of the number
                || phoneVariants.Contains(c.Phone)
                // Rare: stored value still has the same digit string including trunk 0
                || (phoneDigits != ""
                    && c.Phone.Contains(phoneDigits))
                // Local query vs E.164 row: "+923001234567".Contains("3001234567") → true
                || (significantDigits.Length >= 7
                    && c.Phone.Contains(significantDigits)));
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
        string? phoneCountry = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(
            email ?? string.Empty);

        var normalizedPhone = NormalizePhone(phone, phoneCountry);
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
            matches,
            matches.Any(c => NormalizeEmail(c.Email) == normalizedEmail
                && phoneVariants.Contains(c.Phone)),
            matches.Any(c => NormalizeEmail(c.Email) == normalizedEmail),
            matches.Any(c => phoneVariants.Contains(c.Phone)));
    }

    public async Task<(
        CandidateDetail? Detail,
        DuplicateCheckResult? Duplicate,
        string? Error)> CreateAsync(
            CreateCandidateRequest request,
            Stream? resumeContent,
            string? resumeFileName,
            bool confirmDuplicate = false,
            CancellationToken cancellationToken = default)
    {
        if (resumeContent is null || string.IsNullOrWhiteSpace(resumeFileName)
            || (resumeContent.CanSeek && resumeContent.Length == 0))
        {
            return (null, null, "A PDF resume is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Phone))
        {
            return (
                null,
                null,
                "Full name, email, and phone are required.");
        }

        if (string.IsNullOrWhiteSpace(request.Source))
        {
            return (
                null,
                null,
                "Candidate source is required.");
        }

        var email = NormalizeEmail(request.Email);
        var phone = NormalizePhone(request.Phone, request.PhoneCountry);

        if (phone is null)
        {
            return (
                null,
                null,
                "Enter a valid phone number. Select a valid country "
                + "for a local number, or include an international "
                + "code starting with + or 00.");
        }

        var duplicates = await FindDuplicatesAsync(
            email,
            phone,
            cancellationToken: cancellationToken);

        if (duplicates.IsHardDuplicate
            || (duplicates.IsDuplicate && !confirmDuplicate))
        {
            return (null, duplicates, null);
        }

        string resumePath;
        try
        {
            resumePath = await files.SaveAsync(resumeContent, resumeFileName, cancellationToken);
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

            Source = request.Source.Trim(),

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
            await files.DeleteAsync(resumePath, CancellationToken.None);

            duplicates = await FindDuplicatesAsync(
                email,
                phone,
                cancellationToken: cancellationToken);

            if (!duplicates.IsHardDuplicate)
            {
                throw;
            }

            return (null, duplicates, null);
        }
        catch
        {
            await files.DeleteAsync(resumePath, CancellationToken.None);
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
            try
            {
                await files.DeleteAsync(
                    previousResumePath,
                    CancellationToken.None);
            }
            catch (IOException)
            {
                logger.LogWarning(
                    "Previous resume file could not be deleted after replacement.");
            }
            catch (UnauthorizedAccessException)
            {
                logger.LogWarning(
                    "Previous resume file could not be deleted after replacement.");
            }
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


    /// <summary>
    /// Turns user input into one E.164 value used for storage and matching.
    /// Example walkthrough (Pakistan mobile):
    ///   input  phone = "0300 123-4567", phoneCountry = "PK"
    ///   → compact "03001234567"
    ///   → parse with region PK
    ///   → return "+923001234567"
    /// </summary>
    private static string? NormalizePhone(
        string? phone,
        string? phoneCountry = null)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length > 32)
        {
            return null;
        }

        // "0300 123-4567" → "03001234567" (spaces, (), ., - removed)
        var compact = Regex.Replace(
            phone.Trim(),
            @"[\s().-]",
            string.Empty);

        // "00923001234567" → "+923001234567"
        if (compact.StartsWith("00"))
        {
            compact = "+" + compact.Substring(2);
        }

        // Reject letters / junk after cleanup
        if (!Regex.IsMatch(compact, @"^\+?[0-9]+$"))
        {
            return null;
        }

        var phoneUtil = PhoneNumberUtil.GetInstance();

        string? region = null;

        if (!string.IsNullOrWhiteSpace(phoneCountry))
        {
            // "pk" → "PK"
            region = phoneCountry.Trim().ToUpperInvariant();

            if (!phoneUtil.GetSupportedRegions().Contains(region))
            {
                return null;
            }
        }

        if (compact.StartsWith("+"))
        {
            // Already international (e.g. "+923001234567") — country comes from the number.
            region = null;
        }
        else if (region is null)
        {
            // Local "03001234567" with no country cannot be interpreted safely.
            return null;
        }

        try
        {
            // Parse "03001234567" as a PK number → country code 92, national 3001234567
            var parsed = phoneUtil.Parse(compact, region);

            if (!phoneUtil.IsValidNumber(parsed))
            {
                return null;
            }

            // When the user picked a country, confirm the number is valid for that country.
            if (region is not null
                && !phoneUtil.IsValidNumberForRegion(parsed, region))
            {
                return null;
            }

            // Canonical storage form: "+923001234567"
            var normalized = phoneUtil.Format(
                parsed,
                PhoneNumberFormat.E164);

            // E.164 allows at most 15 digits after '+'
            var digitCount = normalized.Length - 1;

            if (digitCount > 15)
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

    /// <summary>
    /// Builds alternate spellings of one E.164 number so DB rows in older formats still match.
    /// Starting from normalizedPhone = "+923001234567":
    ///   "+923001234567"     E.164 (how we store new candidates)
    ///   "923001234567"      same digits without '+'
    ///   "00923001234567"    international prefix 00
    ///   "03001234567"       national digits with trunk 0 (common local typing / legacy rows)
    ///   "3001234567"        national number only
    /// </summary>
    private static string[] GetPhoneVariants(string? normalizedPhone)
    {
        if (normalizedPhone is null)
        {
            return Array.Empty<string>();
        }

        // Seed with the three international-style forms of "+923001234567"
        var variants = new HashSet<string>(StringComparer.Ordinal)
        {
            normalizedPhone,                       // "+923001234567"
            normalizedPhone.Substring(1),          // "923001234567"
            "00" + normalizedPhone.Substring(1)    // "00923001234567"
        };

        try
        {
            var phoneUtil = PhoneNumberUtil.GetInstance();
            // Parse the E.164 string back into country + national parts
            var parsed = phoneUtil.Parse(normalizedPhone, null);

            // NATIONAL format for PK is often "0300 1234567" → digits "03001234567"
            var nationalDigits = Regex.Replace(
                phoneUtil.Format(parsed, PhoneNumberFormat.NATIONAL),
                @"\D",
                string.Empty);

            // Core national number without trunk prefix: 3001234567
            var nationalNumber = parsed.NationalNumber.ToString();

            if (nationalDigits.Length > 0)
            {
                variants.Add(nationalDigits);      // "03001234567"
            }

            if (nationalNumber.Length > 0)
            {
                variants.Add(nationalNumber);      // "3001234567"
                // Explicit trunk-0 local form used in many countries including PK
                variants.Add("0" + nationalNumber); // "03001234567"
            }
        }
        catch (NumberParseException)
        {
            // Keep the basic E.164 / 00 variants only.
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
    32,
    ErrorMessage = "Phone cannot exceed 32 characters.")]
    string Phone,

    [StringLength(1000)]
    string? Skills,

    [Required(ErrorMessage = "Candidate source is required.")]
    [StringLength(100)]
    string Source,

    DateTime? ConsentDate,

    [StringLength(
        2,
        MinimumLength = 2,
        ErrorMessage = "PhoneCountry must be a two-letter country code.")]
    string? PhoneCountry = null);

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
        32,
        ErrorMessage = "Phone cannot exceed 32 characters.")]
    string? Phone,

    [StringLength(
        2,
        MinimumLength = 2,
        ErrorMessage = "PhoneCountry must be a two-letter country code.")]
    string? PhoneCountry = null);

public record DuplicateCheckResult(
    bool IsDuplicate,
    IReadOnlyList<CandidateListItem> Matches,
    bool IsHardDuplicate = false,
    bool MatchesEmail = false,
    bool MatchesPhone = false)
{
    public bool CanCreateAnyway => IsDuplicate && !IsHardDuplicate;
}
