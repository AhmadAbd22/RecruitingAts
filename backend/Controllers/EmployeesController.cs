using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/employees")]
public class EmployeesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EmployeeListItem>>> List(CancellationToken cancellationToken)
    {
        var items = await db.Employees.AsNoTracking()
            .Where(e => e.IsActive)
            .OrderBy(e => e.FullName)
            .Select(e => new EmployeeListItem(e.EmployeeId, e.FullName, e.Email, e.Department))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}

public record EmployeeListItem(Guid EmployeeId, string FullName, string Email, string Department);
