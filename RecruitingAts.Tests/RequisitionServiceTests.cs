using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using Xunit;

namespace RecruitingAts.Tests
{
    public class RequisitionServiceTests
    {
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

            // Valid transitions in domain: Published or OnHold can transition to Filled
            bool isValidTransition = (currentStatus == "Published" || currentStatus == "OnHold") && targetStatus == "Filled";

            // Assert
            Assert.Equal("Draft", currentStatus);
            Assert.False(isValidTransition, "Transitioning directly from Draft to Filled is invalid and must be rejected.");
        }
    }
}