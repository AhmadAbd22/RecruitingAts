using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/interviews")]
public class InterviewsController(
    InterviewService interviews) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = Permissions.InterviewsSchedule)]
    public async Task<IActionResult> Create(
        [FromBody] CreateInterviewRequest request,
        CancellationToken cancellationToken)
    {
        var result = await interviews.CreateAsync(
            request,
            User,
            cancellationToken);

        if (result.Status == InterviewCreateStatus.NotFound)
        {
            return NotFound(new { message = result.Message });
        }

        if (result.Status == InterviewCreateStatus.Forbidden)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new { message = result.Message });
        }

        if (result.Status == InterviewCreateStatus.Invalid)
        {
            return BadRequest(new { message = result.Message });
        }

        var interview = result.Interview!;

        return CreatedAtAction(
            nameof(Get),
            new { id = interview.InterviewId },
            interview);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var interview = await interviews.GetAsync(
            id,
            User,
            cancellationToken);

        if (interview is null)
        {
            return NotFound(new
            {
                message = "Interview not found or not in your scope."
            });
        }

        return Ok(interview);
    }

    [HttpGet("my")]
    public async Task<IActionResult> MyInterviews(
    CancellationToken cancellationToken)
    {
        var items = await interviews.GetMyInterviewsAsync(
            User,
            cancellationToken);

        return Ok(items);
    }

    [HttpPost("{id:guid}/feedback")]
    [Authorize(Policy = Permissions.InterviewsFeedbackAdd)]
    public async Task<IActionResult> SubmitFeedback(
        Guid id,
        [FromBody] SubmitInterviewFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        var result = await interviews.SubmitFeedbackAsync(
            id,
            request,
            User,
            cancellationToken);

        return FeedbackResponse(result);
    }

    [HttpGet("{id:guid}/feedback")]
    public async Task<IActionResult> GetFeedback(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await interviews.GetFeedbackAsync(
            id,
            User,
            cancellationToken);

        return FeedbackResponse(result);
    }

    private IActionResult FeedbackResponse(
        InterviewFeedbackResult result)
    {
        if (result.Status == InterviewFeedbackStatus.NotFound)
        {
            return NotFound(new { message = result.Message });
        }

        if (result.Status == InterviewFeedbackStatus.Forbidden)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new { message = result.Message });
        }

        if (result.Status == InterviewFeedbackStatus.Invalid)
        {
            return BadRequest(new { message = result.Message });
        }

        if (result.Status == InterviewFeedbackStatus.AlreadySubmitted)
        {
            return Conflict(new { message = result.Message });
        }

        if (result.Items is not null)
        {
            return Ok(result.Items);
        }

        return Ok(new { message = result.Message });
    }
}