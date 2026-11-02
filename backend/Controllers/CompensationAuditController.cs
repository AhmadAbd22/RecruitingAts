using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Route("api/audit/compensation")]
[Authorize(Policy = Permissions.CompensationView)]
public class CompensationAuditController(CompensationAuditService audit) : ControllerBase
{
    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        return Ok(await audit.ListAsync(User, cancellationToken));
    }
}
