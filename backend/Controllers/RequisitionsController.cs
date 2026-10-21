using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/requisitions")]
public class RequisitionsController(RequisitionService requisitions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RequisitionListItem>>> List(CancellationToken cancellationToken)
    {
        var items = await requisitions.ListAsync(User, cancellationToken);
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RequisitionDetail>> Get(Guid id, CancellationToken cancellationToken)
    {
        var detail = await requisitions.GetAsync(id, User, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.RequisitionsManage)]
    public async Task<ActionResult<RequisitionDetail>> Create(
        [FromBody] CreateRequisitionRequest request,
        CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.CreateAsync(request, User, cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return CreatedAtAction(nameof(Get), new { id = detail!.RequisitionId }, detail);
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Policy = Permissions.RequisitionsManage)]
    public async Task<ActionResult<RequisitionDetail>> Submit(Guid id, CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.SubmitForApprovalAsync(id, User, cancellationToken);
        return ToResult(detail, error);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Policy = Permissions.RequisitionsApprove)]
    public async Task<ActionResult<RequisitionDetail>> Approve(Guid id, CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.ApproveAsync(id, User, cancellationToken);
        return ToResult(detail, error);
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = Permissions.RequisitionsApprove)]
    public async Task<ActionResult<RequisitionDetail>> Reject(
        Guid id,
        [FromBody] ReasonRequest request,
        CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.RejectAsync(id, request.Reason, User, cancellationToken);
        return ToResult(detail, error);
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Policy = Permissions.RequisitionsManage)]
    public async Task<ActionResult<RequisitionDetail>> Publish(Guid id, CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.PublishAsync(id, User, cancellationToken);
        return ToResult(detail, error);
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Policy = Permissions.RequisitionsManage)]
    public async Task<ActionResult<RequisitionDetail>> ChangeStatus(
        Guid id,
        [FromBody] StatusChangeRequest request,
        CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.ChangeStatusAsync(
            id,
            request.Status,
            request.Reason,
            User,
            cancellationToken);
        return ToResult(detail, error);
    }

    [HttpPut("{id:guid}/budget")]
    [Authorize(Policy = Permissions.CompensationEdit)]
    public async Task<ActionResult<RequisitionDetail>> UpdateBudget(
        Guid id,
        [FromBody] BudgetRequest request,
        CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.UpdateBudgetAsync(
            id,
            request.BudgetMin,
            request.BudgetMax,
            User,
            cancellationToken);
        return ToResult(detail, error);
    }

    [HttpPost("{id:guid}/team")]
    [Authorize(Policy = Permissions.RequisitionsManage)]
    public async Task<ActionResult<RequisitionDetail>> AddTeamMember(
        Guid id,
        [FromBody] AddTeamMemberRequest request,
        CancellationToken cancellationToken)
    {
        var (detail, error) = await requisitions.AddTeamMemberAsync(
            id,
            request.EmployeeId,
            request.TeamRole,
            User,
            cancellationToken);
        return ToResult(detail, error);
    }

    [HttpDelete("{id:guid}/team/{teamMemberId:guid}")]
    [Authorize(Policy = Permissions.RequisitionsManage)]
    public async Task<IActionResult> RemoveTeamMember(
        Guid id,
        Guid teamMemberId,
        CancellationToken cancellationToken)
    {
        var (ok, error) = await requisitions.RemoveTeamMemberAsync(id, teamMemberId, User, cancellationToken);
        if (!ok)
        {
            return BadRequest(new { message = error });
        }

        return NoContent();
    }

    private ActionResult<RequisitionDetail> ToResult(RequisitionDetail? detail, string? error)
    {
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return detail is null ? NotFound() : Ok(detail);
    }
}

public record ReasonRequest(string Reason);
public record StatusChangeRequest(string Status, string? Reason);
public record BudgetRequest(decimal? BudgetMin, decimal? BudgetMax);
public record AddTeamMemberRequest(Guid EmployeeId, string TeamRole);
