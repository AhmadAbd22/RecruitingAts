using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Authorize(Policy = Permissions.StagesManage)]
[Route("api/pipeline-stages")]
public class PipelineStagesController(PipelineStageService stages) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var items = await stages.ListAsync(cancellationToken);
        return Ok(items);
    }

    public class CreateStageRequest
    {
        public string Name { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 10;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateStageRequest request,
        CancellationToken cancellationToken)
    {
        var (stage, error) = await stages.CreateWorkingAsync(
            request?.Name ?? string.Empty,
            request?.SortOrder ?? 10,
            cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return CreatedAtAction(nameof(List), stage);
    }

    public class RenameStageRequest
    {
        public string Name { get; set; } = string.Empty;
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Rename(
        Guid id,
        [FromBody] RenameStageRequest request,
        CancellationToken cancellationToken)
    {
        var (stage, error) = await stages.RenameAsync(
            id,
            request?.Name ?? string.Empty,
            cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(stage);
    }

    public class SetActiveRequest
    {
        public bool IsActive { get; set; }
    }

    [HttpPatch("{id:guid}/active")]
    public async Task<IActionResult> SetActive(
        Guid id,
        [FromBody] SetActiveRequest request,
        CancellationToken cancellationToken)
    {
        var (stage, error) = await stages.SetActiveAsync(
            id,
            request?.IsActive ?? false,
            cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(stage);
    }
}
