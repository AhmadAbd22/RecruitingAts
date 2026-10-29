using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;
using RecruitingAts.Api.Storage;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true)]
[Route("api/candidates")]
public class CandidatesController(CandidateService candidates) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.PoolView)]
    public async Task<ActionResult<IReadOnlyList<CandidateListItem>>> Search(
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        var items = await candidates.SearchAsync(q, cancellationToken);
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.PoolView)]
    public async Task<ActionResult<CandidateDetail>> Get(Guid id, CancellationToken cancellationToken)
    {
        var detail = await candidates.GetAsync(id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpGet("duplicates")]
    [Authorize(Policy = Permissions.CandidatesManage)]
    public async Task<ActionResult<DuplicateCheckResult>> Duplicates(
        [FromQuery] DuplicateCheckRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email)
            && string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new
            {
                message = "Provide an email address or phone number."
            });
        }

        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            if (!candidates.IsPhoneValid(
                request.Phone,
                request.PhoneCountry))
            {
                return BadRequest(new
                {
                    message =
                        "Enter a valid phone number. Select a valid country "
                        + "for a local number, or include an international "
                        + "code starting with + or 00."
                });
            }
        }

        var result = await candidates.FindDuplicatesAsync(
            request.Email,
            request.Phone,
            phoneCountry: request.PhoneCountry,
            cancellationToken: cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.CandidatesManage)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LocalFileStorage.MaxResumeBytes + 64 * 1024)]
    public async Task<ActionResult> Create(
        [FromForm] CreateCandidateRequest request,
        IFormFile? file,
        [FromQuery] bool confirmDuplicate = false,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "A PDF resume is required." });
        }

        if (file.Length > LocalFileStorage.MaxResumeBytes)
        {
            return BadRequest(new { message = "PDF must be 5 MB or smaller." });
        }

        await using var stream = file.OpenReadStream();
        var (detail, duplicate, error) = await candidates.CreateAsync(
            request,
            stream,
            file.FileName,
            confirmDuplicate,
            cancellationToken);

        if (duplicate != null && duplicate.IsDuplicate)
        {
            string message;
            if (duplicate.IsHardDuplicate)
            {
                message = "A candidate with this email address and phone number already exists. Use the existing candidate.";
            }
            else if (duplicate.MatchesEmail && duplicate.MatchesPhone)
            {
                message = "This email address and phone number are already used by existing candidates. Review the matches before saving.";
            }
            else if (duplicate.MatchesEmail)
            {
                message = "This email address is already used by another candidate. Review the matches before saving.";
            }
            else
            {
                message = "This phone number is already used by another candidate. Review the matches before saving.";
            }

            return Conflict(new
            {
                message,
                duplicate
            });
        }

        if (error != null)
        {
            return BadRequest(new
            {
                message = error
            });
        }

        return CreatedAtAction(
            nameof(Get),
            new { id = detail!.CandidateId },
            detail);
    }

    [HttpPost("{id:guid}/resume")]
    [Authorize(Policy = Permissions.CandidatesManage)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LocalFileStorage.MaxResumeBytes + 64 * 1024)]
    public async Task<ActionResult<CandidateDetail>> UploadResume(
        Guid id,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new
            {
                message = "Please select a non-empty PDF file."
            });
        }

        if (file.Length > LocalFileStorage.MaxResumeBytes)
        {
            return BadRequest(new
            {
                message = "PDF must be 5 MB or smaller."
            });
        }

        await using var stream = file.OpenReadStream();

        var (detail, error) = await candidates.AttachResumeAsync(
            id,
            stream,
            file.FileName,
            cancellationToken);

        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(detail);
    }

    [HttpGet("{id:guid}/resume")]
    [Authorize(Policy = Permissions.PoolView)]
    public async Task<IActionResult> DownloadResume(Guid id, CancellationToken cancellationToken)
    {
        var (stream, fileName, error) = await candidates.OpenResumeAsync(id, cancellationToken);
        if (error is not null || stream is null)
        {
            return NotFound(new { message = error ?? "Not found." });
        }

        return File(stream, "application/pdf", fileName);
    }
}
