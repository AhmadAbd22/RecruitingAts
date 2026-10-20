using Microsoft.AspNetCore.Mvc;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() =>
        Ok(new { status = "ok", service = "RecruitingAts.Api", utc = DateTime.UtcNow });
}
