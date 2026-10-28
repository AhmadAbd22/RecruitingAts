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

        [HttpPost]
        public async Task<IActionResult> Create(
    [FromBody] CreateApplicationRequest request,
    CancellationToken cancellationToken)
        {
            var result = await applicationService.CreateAsync(
                request,
                User,
                cancellationToken);

            switch (result.Status)
            {
                case ApplicationCreateStatus.Success:
                    return Ok(new
                    {
                        result.Application!.ApplicationId,
                        result.Application.CandidateId,
                        result.Application.RequisitionId,
                        result.Application.PipelineStageId,
                        result.Application.Source,
                        result.Application.CreatedAt
                    });

                case ApplicationCreateStatus.CandidateNotFound:
                    return NotFound(new { message = "Candidate not found." });

                case ApplicationCreateStatus.RequisitionNotFound:
                    return NotFound(new { message = "Requisition not found." });

                case ApplicationCreateStatus.Forbidden:
                    return StatusCode(StatusCodes.Status403Forbidden,
                        new { message = "You do not have access to this requisition." });

                case ApplicationCreateStatus.RequisitionNotPublished:
                    return BadRequest(new
                    {
                        message = "Applications can only be created for published requisitions."
                    });

                case ApplicationCreateStatus.DuplicateApplication:
                    return Conflict(new
                    {
                        message = "This candidate already has an application for this requisition."
                    });

                case ApplicationCreateStatus.AppliedStageNotFound:
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { message = "The Applied pipeline stage is not configured." });

                default:
                    return BadRequest();
            }
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
                User,
                cancellationToken);

            switch (updated.Status)
            {
                case ApplicationStageUpdateStatus.Success:
                    return NoContent();

                case ApplicationStageUpdateStatus.ApplicationNotFound:
                case ApplicationStageUpdateStatus.StageNotFound:
                    return NotFound(new
                    {
                        message = "Application or pipeline stage not found."
                    });

                case ApplicationStageUpdateStatus.Forbidden:
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "You do not have access to this requisition."
                    });

                case ApplicationStageUpdateStatus.DispositionReasonRequired:
                    return BadRequest(new
                    {
                        message = "A disposition reason is required for Disqualified or NFA."
                    });

                default:
                    return BadRequest();
            }
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

        [HttpGet("stages")]
        [Authorize(Policy = Permissions.ApplicationsManage)]
        public async Task<ActionResult<List<ApplicationPipelineStageDto>>> GetStages(
            CancellationToken cancellationToken)
        {
            var stages = await applicationService.GetPipelineStagesAsync(
                cancellationToken);

            return Ok(stages);
        }
    }
}
