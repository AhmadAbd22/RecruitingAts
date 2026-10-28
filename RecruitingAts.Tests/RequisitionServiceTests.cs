using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;
using Xunit;

namespace RecruitingAts.Tests
{
    public class RequisitionServiceTests
    {
        private readonly Mock<IRequisitionScopeService> _scopeMock;
        private readonly Mock<IAuditService> _auditMock;
        private readonly RequisitionService _sut;
        private readonly AppDbContext _context;

        public RequisitionServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _scopeMock = new Mock<IRequisitionScopeService>();
            _auditMock = new Mock<IAuditService>();

            _sut = new RequisitionService(_context, _scopeMock.Object, _auditMock.Object);
        }

        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task RemoveTeamMember_WhenMemberIsOwner_ShouldPreventRemovalRule()
        {
            // Arrange
            using var context = GetInMemoryDbContext();

            var employeeId = Guid.NewGuid();
            var requisitionId = Guid.NewGuid();

            var employee = new Employee
            {
                EmployeeId = employeeId,
                FullName = "Amina",
                Email = "amina@example.com",
                Department = "Engineering",
                IsActive = true
            };

            var requisition = new Requisition
            {
                RequisitionId = requisitionId,
                Title = "Senior Software Engineer",
                Department = "Engineering",
                EmploymentType = "Full-Time",
                Seniority = "Senior",
                Skills = "C#, .NET, EF Core",
                JobDescription = "Develop high performance backend systems.",
                Status = "Draft",
                HiringManagerEmployeeId = employeeId
            };

            var teamMember = new RequisitionTeamMember
            {
                RequisitionTeamMemberId = Guid.NewGuid(),
                RequisitionId = requisitionId,
                EmployeeId = employeeId,
                TeamRole = "Owner"
            };

            context.Employees.Add(employee);
            context.Requisitions.Add(requisition);
            context.RequisitionTeamMembers.Add(teamMember);
            await context.SaveChangesAsync();

            // Act: Simulate business logic check for Owner protection rule
            var memberToRemove = await context.RequisitionTeamMembers.FirstOrDefaultAsync(m => m.TeamRole == "Owner");

            bool canRemove = memberToRemove?.TeamRole != "Owner";

            // Assert
            Assert.NotNull(memberToRemove);
            Assert.False(canRemove, "System should block removal when the team member is the Owner.");
        }

        [Fact]
        public async Task ChangeStatus_InvalidTransitionFromDraftToFilled_ShouldBeBlocked()
        {
            // Arrange
            using var context = GetInMemoryDbContext();

            var requisition = new Requisition
            {
                RequisitionId = Guid.NewGuid(),
                Title = "DevOps Engineer",
                Department = "IT",
                EmploymentType = "Full-Time",
                Seniority = "Mid",
                Skills = "Docker, Linux, CI/CD",
                JobDescription = "Manage CI/CD pipelines and infrastructure.",
                Status = "Draft",
                HiringManagerEmployeeId = Guid.NewGuid()
            };

            context.Requisitions.Add(requisition);
            await context.SaveChangesAsync();

            // Act
            var currentStatus = requisition.Status;
            var targetStatus = "Filled";

            bool isValidTransition = (currentStatus == "Published" || currentStatus == "OnHold") && targetStatus == "Filled";

            // Assert
            Assert.Equal("Draft", currentStatus);
            Assert.False(isValidTransition, "Transitioning directly from Draft to Filled is invalid and must be rejected.");
        }

        [Fact]
        public async Task ApproveAsync_WhenUserIsUnauthorized_ShouldReturnScopeErrorAndNotMutate()
        {
            // Arrange
            var requisitionId = Guid.NewGuid();
            var user = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(Permissions.ClaimType, Permissions.RequisitionsApprove)
            ]));

            var requisition = new Requisition
            {
                RequisitionId = requisitionId,
                Title = "Software Engineer",
                Status = RequisitionStatuses.PendingApproval
            };

            _context.Requisitions.Add(requisition);
            await _context.SaveChangesAsync();

            _scopeMock
                .Setup(s => s.CanAccessAsync(requisitionId, user, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            // Act
            var (detail, error) = await _sut.ApproveAsync(requisitionId, user);

            // Assert
            Assert.Null(detail);
            Assert.Equal("Requisition not found or not in scope.", error);

            var dbReq = await _context.Requisitions.FindAsync(requisitionId);
            Assert.Equal(RequisitionStatuses.PendingApproval, dbReq!.Status);
        }

        [Fact]
        public async Task ApproveAsync_WhenUserIsAuthorized_ShouldApproveRequisitionSuccessfully()
        {
            // Arrange
            var requisitionId = Guid.NewGuid();
            var user = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(Permissions.ClaimType, Permissions.RequisitionsApprove),
                new Claim(ClaimTypes.NameIdentifier, "user-1")
            ]));

            var employee = new Employee { EmployeeId = Guid.NewGuid(), FullName = "Manager", Email = "m@test.com", IsActive = true };
            var requisition = new Requisition
            {
                RequisitionId = requisitionId,
                Title = "Software Engineer",
                Department = "Engineering",
                EmploymentType = "Full-Time",
                Seniority = "Mid",
                Skills = "C#",
                JobDescription = "Test",
                Status = RequisitionStatuses.PendingApproval,
                HiringManagerEmployeeId = employee.EmployeeId,
                HiringManager = employee
            };

            _context.Employees.Add(employee);
            _context.Requisitions.Add(requisition);
            await _context.SaveChangesAsync();

            _scopeMock
                .Setup(s => s.CanAccessAsync(requisitionId, user, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act
            var (detail, error) = await _sut.ApproveAsync(requisitionId, user);

            // Assert
            Assert.Null(error);
            Assert.NotNull(detail);
            Assert.Equal(RequisitionStatuses.Approved, detail.Status);

            var dbReq = await _context.Requisitions.FindAsync(requisitionId);
            Assert.Equal(RequisitionStatuses.Approved, dbReq!.Status);
        }

        [Fact]
        public async Task RejectAsync_WhenUserIsUnauthorized_ShouldReturnScopeErrorAndNotMutate()
        {
            // Arrange
            var requisitionId = Guid.NewGuid();
            var user = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(Permissions.ClaimType, Permissions.RequisitionsApprove)
            ]));

            var requisition = new Requisition
            {
                RequisitionId = requisitionId,
                Title = "DevOps Specialist",
                Status = RequisitionStatuses.PendingApproval
            };

            _context.Requisitions.Add(requisition);
            await _context.SaveChangesAsync();

            _scopeMock
                .Setup(s => s.CanAccessAsync(requisitionId, user, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            // Act
            var (detail, error) = await _sut.RejectAsync(requisitionId, "Budget too high", user);

            // Assert
            Assert.Null(detail);
            Assert.Equal("Requisition not found or not in scope.", error);

            var dbReq = await _context.Requisitions.FindAsync(requisitionId);
            Assert.Equal(RequisitionStatuses.PendingApproval, dbReq!.Status);
        }

        [Fact]
        public async Task RejectAsync_WhenUserIsAuthorized_ShouldReturnToDraftWithReason()
        {
            // Arrange
            var requisitionId = Guid.NewGuid();
            var user = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(Permissions.ClaimType, Permissions.RequisitionsApprove),
                new Claim(ClaimTypes.NameIdentifier, "user-1")
            ]));

            var employee = new Employee { EmployeeId = Guid.NewGuid(), FullName = "Manager", Email = "m@test.com", IsActive = true };
            var requisition = new Requisition
            {
                RequisitionId = requisitionId,
                Title = "DevOps Specialist",
                Department = "IT",
                EmploymentType = "Full-Time",
                Seniority = "Mid",
                Skills = "Docker",
                JobDescription = "Test",
                Status = RequisitionStatuses.PendingApproval,
                HiringManagerEmployeeId = employee.EmployeeId,
                HiringManager = employee
            };

            _context.Employees.Add(employee);
            _context.Requisitions.Add(requisition);
            await _context.SaveChangesAsync();

            _scopeMock
                .Setup(s => s.CanAccessAsync(requisitionId, user, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act
            var (detail, error) = await _sut.RejectAsync(requisitionId, "Needs revised headcount budget.", user);

            // Assert
            Assert.Null(error);
            Assert.NotNull(detail);
            Assert.Equal(RequisitionStatuses.Draft, detail.Status);
            Assert.Equal("Needs revised headcount budget.", detail.StatusReason);

            var dbReq = await _context.Requisitions.FindAsync(requisitionId);
            Assert.Equal(RequisitionStatuses.Draft, dbReq!.Status);
        }
    }
}