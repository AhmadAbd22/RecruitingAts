using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/applications")]
    public class ApplicationController(ApplicationService applicationService) : ControllerBase
    {
        [HttpPost]
        [Authorize(Policy = Permissions.ApplicationsManage)]
        public async Task<ActionResult<Application>> Create(
    [FromBody] CreateApplicationRequest request,
    CancellationToken cancellationToken)
        {
            var application = await applicationService.CreateAsync(
                request, cancellationToken);

            if (application is null)
            {
                return BadRequest(new
                {
                    message = "Could not create application."
                });
            }

            return Ok(new
            {
                application.ApplicationId,
                application.CandidateId,
                application.RequisitionId,
                application.PipelineStageId,
                application.Source,
                application.CreatedAt
            });
        }

        [HttpPatch("{applicationId:guid}/stage")]
        [Authorize(Policy = Permissions.ApplicationsManage)]
        public async Task<IActionResult> UpdateStage(
    Guid applicationId,
    [FromBody] UpdateApplicationStageRequest request,
    CancellationToken cancellationToken)
        {
            var updated = await applicationService.UpdateStageAsync(
                applicationId,
                request,
                cancellationToken);

            if (!updated)
            {
                return BadRequest(new
                {
                    message = "Application or pipeline stage not found."
                });
            }

            return NoContent();
        }

        [HttpGet("pipeline")]
        [Authorize(Policy = Permissions.ApplicationsManage)]
        public async Task<ActionResult<List<ApplicationPipelineItemDto>>> GetPipeline(
    CancellationToken cancellationToken)
        {
            var applications = await applicationService.GetPipelineAsync(
                User, cancellationToken);

            return Ok(applications);
        }
    }
}
