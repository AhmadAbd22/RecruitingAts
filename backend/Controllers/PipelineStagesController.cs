using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Route("api/admin/stages")]
[Authorize(Policy = Permissions.StagesManage)]
public class PipelineStagesController(PipelineStageService stages) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await stages.ListAsync(cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create(SaveStageRequest request, CancellationToken cancellationToken)
    {
        var (stage, error) = await stages.SaveAsync(null, request, User, cancellationToken);
        return error is null ? Ok(new { stage!.PipelineStageId }) : BadRequest(new { message = error });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, SaveStageRequest request, CancellationToken cancellationToken)
    {
        var (stage, error) = await stages.SaveAsync(id, request, User, cancellationToken);
        return error is null ? Ok(new { stage!.PipelineStageId }) : BadRequest(new { message = error });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var error = await stages.DeleteAsync(id, User, cancellationToken);
        return error is null ? NoContent() : BadRequest(new { message = error });
    }
}
