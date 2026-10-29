using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;
using RecruitingAts.Api.Storage;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Authorize]
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
        [FromQuery] string email,
        [FromQuery] string phone,
        CancellationToken cancellationToken)
    {
        var result = await candidates.FindDuplicatesAsync(email, phone, cancellationToken: cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.CandidatesManage)]
    public async Task<ActionResult> Create(
        [FromBody] CreateCandidateRequest request,
        [FromQuery] bool confirmDuplicate = false,
        CancellationToken cancellationToken = default)
    {
        var (detail, duplicate, error) = await candidates.CreateAsync(request, confirmDuplicate, cancellationToken);
        if (duplicate is { IsDuplicate: true } && detail is null && error is null)
        {
            return Conflict(new
            {
                message = "Possible duplicate candidate. Pass confirmDuplicate=true to acknowledge, or use an existing match.",
                duplicate
            });
        }

        if (error is not null)
        {
            return BadRequest(new { message = error, duplicate });
        }

        return CreatedAtAction(nameof(Get), new { id = detail!.CandidateId }, detail);
    }

    [HttpPost("{id:guid}/resume")]
    [Authorize(Policy = Permissions.CandidatesManage)]
    [RequestSizeLimit(LocalFileStorage.MaxResumeBytes)]
    public async Task<ActionResult<CandidateDetail>> UploadResume(
        Guid id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest(new { message = "Empty file." });
        }

        await using var stream = file.OpenReadStream();
        var (detail, error) = await candidates.AttachResumeAsync(id, stream, file.FileName, cancellationToken);
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
