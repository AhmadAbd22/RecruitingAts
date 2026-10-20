using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;

namespace RecruitingAts.Api.Controllers;

/// <summary>
/// Tiny endpoint to verify permission policies in development.
/// </summary>
[ApiController]
[Route("api/debug")]
public class DebugAuthController : ControllerBase
{
    [HttpGet("compensation")]
    [Authorize(Policy = Permissions.CompensationView)]
    public IActionResult CompensationProbe() =>
        Ok(new { message = "You have ATS.COMPENSATION.VIEW" });
}
