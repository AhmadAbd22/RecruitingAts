using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RequisitionsController : ControllerBase
    {
        private readonly IRequisitionService _requisitionService;

        public RequisitionsController(IRequisitionService requisitionService)
        {
            _requisitionService = requisitionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetRequisitions(CancellationToken cancellationToken)
        {
            var list = await _requisitionService.ListAsync(User, cancellationToken);
            return Ok(list);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetRequisition(Guid id, CancellationToken cancellationToken)
        {
            var detail = await _requisitionService.GetAsync(id, User, cancellationToken);
            if (detail is null)
            {
                return NotFound(new { message = "Requisition not found or not in scope." });
            }
            return Ok(detail);
        }

        [HttpPost]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> Create([FromBody] CreateRequisitionRequest request, CancellationToken cancellationToken)
        {
            var (detail, error) = await _requisitionService.CreateAsync(request, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return CreatedAtAction(nameof(GetRequisition), new { id = detail!.RequisitionId }, detail);
        }

        [HttpPost("{id:guid}/submit")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> SubmitForApproval(Guid id, CancellationToken cancellationToken)
        {
            var (detail, error) = await _requisitionService.SubmitForApprovalAsync(id, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpPost("{id:guid}/approve")]
        [Authorize(Policy = "REQUISITIONS.APPROVE")]
        public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken)
        {
            var (detail, error) = await _requisitionService.ApproveAsync(id, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        public class StatusReasonRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        [HttpPost("{id:guid}/reject")]
        [Authorize(Policy = "REQUISITIONS.APPROVE")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] StatusReasonRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
            {
                return BadRequest(new { message = "A comment/reason is required when rejecting a requisition." });
            }

            var (detail, error) = await _requisitionService.RejectAsync(id, request.Reason, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpPost("{id:guid}/publish")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> Publish(Guid id, CancellationToken cancellationToken)
        {
            var (detail, error) = await _requisitionService.PublishAsync(id, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpPost("{id:guid}/hold")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> Hold(Guid id, [FromBody] StatusReasonRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
            {
                return BadRequest(new { message = "A reason is required when putting a requisition on hold." });
            }

            var (detail, error) = await _requisitionService.ChangeStatusAsync(id, "OnHold", request.Reason, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpPost("{id:guid}/close")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> Close(Guid id, [FromBody] StatusReasonRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
            {
                return BadRequest(new { message = "A reason is required when closing a requisition." });
            }

            var (detail, error) = await _requisitionService.ChangeStatusAsync(id, "Closed", request.Reason, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpPost("{id:guid}/cancel")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> Cancel(Guid id, [FromBody] StatusReasonRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
            {
                return BadRequest(new { message = "A reason is required when cancelling a requisition." });
            }

            var (detail, error) = await _requisitionService.ChangeStatusAsync(id, "Cancelled", request.Reason, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpPost("{id:guid}/fill")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> Fill(Guid id, [FromBody] StatusReasonRequest request, CancellationToken cancellationToken)
        {
            var reason = string.IsNullOrWhiteSpace(request?.Reason) ? "Position successfully filled." : request.Reason;
            var (detail, error) = await _requisitionService.ChangeStatusAsync(id, "Filled", reason, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        public class UpdateBudgetRequest
        {
            public decimal? BudgetMin { get; set; }
            public decimal? BudgetMax { get; set; }
        }

        [HttpPut("{id:guid}/budget")]
        [Authorize(Policy = "ATS.COMPENSATION.EDIT")]
        public async Task<IActionResult> UpdateBudget(Guid id, [FromBody] UpdateBudgetRequest request, CancellationToken cancellationToken)
        {
            var (detail, error) = await _requisitionService.UpdateBudgetAsync(id, request?.BudgetMin, request?.BudgetMax, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        public class AddTeamMemberRequest
        {
            public Guid EmployeeId { get; set; }
            public string TeamRole { get; set; } = string.Empty;
        }

        [HttpPost("{id:guid}/team-members")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> AddTeamMember(Guid id, [FromBody] AddTeamMemberRequest request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.TeamRole))
            {
                return BadRequest(new { message = "Valid EmployeeId and TeamRole are required." });
            }

            var (detail, error) = await _requisitionService.AddTeamMemberAsync(id, request.EmployeeId, request.TeamRole, User, cancellationToken);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }
            return Ok(detail);
        }

        [HttpDelete("{id:guid}/team-members/{teamMemberId:guid}")]
        [Authorize(Policy = "REQUISITIONS.MANAGE")]
        public async Task<IActionResult> RemoveTeamMember(Guid id, Guid teamMemberId, CancellationToken cancellationToken)
        {
            var (ok, error) = await _requisitionService.RemoveTeamMemberAsync(id, teamMemberId, User, cancellationToken);
            if (!ok)
            {
                return BadRequest(new { message = error });
            }
            return Ok(new { message = "Team member removed successfully." });
        }
    }
}