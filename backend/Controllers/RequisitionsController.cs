using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RequisitionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RequisitionsController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<bool> CanViewBudget(Guid requisitionId, string currentUserId, string currentUserEmail)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.UserId == currentUserId || e.Email == currentUserEmail);

            if (employee == null) return false;

            var isTeamMember = await _context.RequisitionTeamMembers
                .AnyAsync(tm => tm.RequisitionId == requisitionId && tm.EmployeeId == employee.EmployeeId);

            return employee.Department == "HR" || isTeamMember;
        }

        // GET: api/Requisitions
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Requisition>>> GetRequisitions()
        {
            var requisitions = await _context.Requisitions
                .Include(r => r.HiringManager)
                .Include(r => r.TeamMembers)
                .ToListAsync();

            // FR-REQ-007: Mask budgets by default on list view
            foreach (var req in requisitions)
            {
                req.BudgetMin = null;
                req.BudgetMax = null;
            }

            return requisitions;
        }

        // GET: api/Requisitions/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Requisition>> GetRequisition(Guid id)
        {
            var requisition = await _context.Requisitions
                .Include(r => r.HiringManager)
                .Include(r => r.TeamMembers)
                .FirstOrDefaultAsync(r => r.RequisitionId == id);

            if (requisition == null)
            {
                return NotFound(new { message = "Requisition not found." });
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email);

            // FR-REQ-007: Permission-gated budget confidentiality
            bool hasBudgetAccess = await CanViewBudget(id, currentUserId, currentUserEmail);
            if (!hasBudgetAccess)
            {
                requisition.BudgetMin = null;
                requisition.BudgetMax = null;
            }

            return requisition;
        }

        // POST: api/Requisitions (FR-REQ-001: Creation in Draft status, creator becomes Owner, no budget)
        [HttpPost]
        public async Task<ActionResult<Requisition>> Create([FromBody] Requisition requisition)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized(new { message = "User not authenticated." });
            }

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.UserId == currentUserId || e.Email == currentUserEmail);

            if (employee == null)
            {
                return BadRequest(new { message = "Logged-in user is not linked to any Employee profile." });
            }

            requisition.RequisitionId = Guid.NewGuid();
            requisition.CreatedAt = DateTime.UtcNow;
            requisition.UpdatedAt = DateTime.UtcNow;
            requisition.Status = "Draft";
            requisition.BudgetMin = null;
            requisition.BudgetMax = null;

            if (requisition.TeamMembers == null)
            {
                requisition.TeamMembers = new List<RequisitionTeamMember>();
            }

            // FR-REQ-001 & FR-REQ-004: Creator becomes sole Owner
            requisition.TeamMembers.Add(new RequisitionTeamMember
            {
                RequisitionTeamMemberId = Guid.NewGuid(),
                RequisitionId = requisition.RequisitionId,
                EmployeeId = employee.EmployeeId,
                TeamRole = "Owner",
                AddedAt = DateTime.UtcNow
            });

            _context.Requisitions.Add(requisition);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRequisition), new { id = requisition.RequisitionId }, requisition);
        }

        // PUT: api/Requisitions/{id} (FR-REQ-008: Edit rules depending on status)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRequisition(Guid id, [FromBody] Requisition updatedRequisition)
        {
            var existingRequisition = await _context.Requisitions.FindAsync(id);
            if (existingRequisition == null)
            {
                return NotFound(new { message = "Requisition not found." });
            }

            // Cannot update closed or cancelled requisitions
            if (existingRequisition.Status == "Closed" || existingRequisition.Status == "Cancelled" || existingRequisition.Status == "Filled")
            {
                return BadRequest(new { message = $"Requisition cannot be edited in '{existingRequisition.Status}' status." });
            }

            // FR-REQ-008: Material changes after Publish require re-approval
            if (existingRequisition.Status == "Published" || existingRequisition.Status == "Approved")
            {
                existingRequisition.Status = "PendingApproval";
                existingRequisition.StatusReason = "Re-approval required due to material modifications after publishing/approval.";
            }

            existingRequisition.Title = updatedRequisition.Title;
            existingRequisition.Department = updatedRequisition.Department;
            existingRequisition.EmploymentType = updatedRequisition.EmploymentType;
            existingRequisition.Seniority = updatedRequisition.Seniority;
            existingRequisition.Skills = updatedRequisition.Skills;
            existingRequisition.JobDescription = updatedRequisition.JobDescription;
            existingRequisition.Openings = updatedRequisition.Openings;
            existingRequisition.BudgetMin = updatedRequisition.BudgetMin;
            existingRequisition.BudgetMax = updatedRequisition.BudgetMax;
            existingRequisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(existingRequisition);
        }

        // POST: api/Requisitions/{id}/submit (FR-REQ-002)
        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitForApproval(Guid id)
        {
            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            if (requisition.Status != "Draft")
                return BadRequest(new { message = "Only requisitions in 'Draft' status can be submitted for approval." });

            requisition.Status = "PendingApproval";
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // POST: api/Requisitions/{id}/approve (FR-REQ-002)
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(Guid id)
        {
            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            if (requisition.Status != "PendingApproval")
                return BadRequest(new { message = "Only requisitions pending approval can be approved." });

            requisition.Status = "Approved";
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        public class StatusReasonRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        // POST: api/Requisitions/{id}/reject (FR-REQ-002)
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] StatusReasonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
                return BadRequest(new { message = "A comment/reason is required when rejecting a requisition." });

            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            if (requisition.Status != "PendingApproval")
                return BadRequest(new { message = "Only requisitions pending approval can be rejected." });

            requisition.Status = "Draft";
            requisition.StatusReason = request.Reason;
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // POST: api/Requisitions/{id}/publish (FR-REQ-003: Publish Requisition)
        [HttpPost("{id}/publish")]
        public async Task<IActionResult> Publish(Guid id)
        {
            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            if (requisition.Status != "Approved")
                return BadRequest(new { message = "Only 'Approved' requisitions can be published." });

            requisition.Status = "Published";
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // POST: api/Requisitions/{id}/clone (FR-REQ-010: Clone Requisition into new Draft)
        [HttpPost("{id}/clone")]
        public async Task<IActionResult> Clone(Guid id)
        {
            var sourceRequisition = await _context.Requisitions.FindAsync(id);
            if (sourceRequisition == null) return NotFound(new { message = "Source requisition not found." });

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email);

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.UserId == currentUserId || e.Email == currentUserEmail);

            if (employee == null) return BadRequest(new { message = "Logged-in user is not linked to any Employee profile." });

            // Create cloned draft copy (Copy criteria; do NOT copy team or applications)
            var clonedRequisition = new Requisition
            {
                RequisitionId = Guid.NewGuid(),
                Title = $"{sourceRequisition.Title} (Clone)",
                Department = sourceRequisition.Department,
                EmploymentType = sourceRequisition.EmploymentType,
                Seniority = sourceRequisition.Seniority,
                Skills = sourceRequisition.Skills,
                JobDescription = sourceRequisition.JobDescription,
                Openings = sourceRequisition.Openings,
                HiringManagerEmployeeId = sourceRequisition.HiringManagerEmployeeId,
                Status = "Draft",
                BudgetMin = null,
                BudgetMax = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TeamMembers = new List<RequisitionTeamMember>()
            };

            // Assign current user as single Owner of cloned draft
            clonedRequisition.TeamMembers.Add(new RequisitionTeamMember
            {
                RequisitionTeamMemberId = Guid.NewGuid(),
                RequisitionId = clonedRequisition.RequisitionId,
                EmployeeId = employee.EmployeeId,
                TeamRole = "Owner",
                AddedAt = DateTime.UtcNow
            });

            _context.Requisitions.Add(clonedRequisition);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRequisition), new { id = clonedRequisition.RequisitionId }, clonedRequisition);
        }

        // POST: api/Requisitions/{id}/hold (FR-REQ-009)
        [HttpPost("{id}/hold")]
        public async Task<IActionResult> Hold(Guid id, [FromBody] StatusReasonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
                return BadRequest(new { message = "A reason is required when putting a requisition on hold." });

            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            requisition.Status = "OnHold";
            requisition.StatusReason = request.Reason;
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // POST: api/Requisitions/{id}/close (FR-REQ-009)
        [HttpPost("{id}/close")]
        public async Task<IActionResult> Close(Guid id, [FromBody] StatusReasonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
                return BadRequest(new { message = "A reason is required when closing a requisition." });

            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            requisition.Status = "Closed";
            requisition.StatusReason = request.Reason;
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // POST: api/Requisitions/{id}/cancel (FR-REQ-009)
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id, [FromBody] StatusReasonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
                return BadRequest(new { message = "A reason is required when cancelling a requisition." });

            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            requisition.Status = "Cancelled";
            requisition.StatusReason = request.Reason;
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // POST: api/Requisitions/{id}/fill (FR-REQ-009)
        [HttpPost("{id}/fill")]
        public async Task<IActionResult> Fill(Guid id, [FromBody] StatusReasonRequest request)
        {
            var requisition = await _context.Requisitions.FindAsync(id);
            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            requisition.Status = "Filled";
            requisition.StatusReason = request?.Reason ?? "Position successfully filled.";
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(requisition);
        }

        // FR-REQ-004: Add Team Member (Enforces exactly 1 Owner)
        public class AddTeamMemberRequest
        {
            public Guid EmployeeId { get; set; }
            public string TeamRole { get; set; } = string.Empty; // "Owner", "Recruiter", "Interviewer"
        }

        [HttpPost("{id}/team-members")]
        public async Task<IActionResult> AddTeamMember(Guid id, [FromBody] AddTeamMemberRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.TeamRole))
                return BadRequest(new { message = "Valid EmployeeId and TeamRole are required." });

            var requisition = await _context.Requisitions
                .Include(r => r.TeamMembers)
                .FirstOrDefaultAsync(r => r.RequisitionId == id);

            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            // FR-REQ-004 Rule: Exactly one Owner allowed per requisition
            if (request.TeamRole.Equals("Owner", StringComparison.OrdinalIgnoreCase))
            {
                var existingOwner = requisition.TeamMembers.FirstOrDefault(tm => tm.TeamRole.Equals("Owner", StringComparison.OrdinalIgnoreCase));
                if (existingOwner != null && existingOwner.EmployeeId != request.EmployeeId)
                {
                    return BadRequest(new { message = "A requisition can only have exactly one Owner. Transfer ownership or choose another role." });
                }
            }

            var employeeExists = await _context.Employees.AnyAsync(e => e.EmployeeId == request.EmployeeId);
            if (!employeeExists) return BadRequest(new { message = "Employee not found." });

            var existingMember = requisition.TeamMembers
                .FirstOrDefault(tm => tm.EmployeeId == request.EmployeeId && tm.TeamRole == request.TeamRole);

            if (existingMember != null)
                return BadRequest(new { message = "This employee is already assigned to this requisition with the specified role." });

            var newTeamMember = new RequisitionTeamMember
            {
                RequisitionTeamMemberId = Guid.NewGuid(),
                RequisitionId = id,
                EmployeeId = request.EmployeeId,
                TeamRole = request.TeamRole,
                AddedAt = DateTime.UtcNow
            };

            _context.RequisitionTeamMembers.Add(newTeamMember);
            requisition.TeamMembers.Add(newTeamMember);
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(newTeamMember);
        }

        // FR-REQ-004: Remove Team Member
        [HttpDelete("{id}/team-members/{teamMemberId}")]
        public async Task<IActionResult> RemoveTeamMember(Guid id, Guid teamMemberId)
        {
            var requisition = await _context.Requisitions
                .Include(r => r.TeamMembers)
                .FirstOrDefaultAsync(r => r.RequisitionId == id);

            if (requisition == null) return NotFound(new { message = "Requisition not found." });

            var teamMember = requisition.TeamMembers
                .FirstOrDefault(tm => tm.RequisitionTeamMemberId == teamMemberId);

            if (teamMember == null) return NotFound(new { message = "Team member assignment not found." });

            _context.RequisitionTeamMembers.Remove(teamMember);
            requisition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Team member removed successfully." });
        }
    }
}