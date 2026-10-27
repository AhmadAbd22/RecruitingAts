using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Auth;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Domain;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

internal static class TestFixture
{
    public static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    public static ClaimsPrincipal User(
        string userId,
        params string[] permissions)
    {
        var identity = new ClaimsIdentity("Test");
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, userId));
        foreach (var permission in permissions)
        {
            identity.AddClaim(new Claim(Permissions.ClaimType, permission));
        }

        return new ClaimsPrincipal(identity);
    }

    public static Employee AddEmployee(
        AppDbContext db,
        string fullName,
        string email,
        string? userId = null,
        string department = "Engineering")
    {
        var employee = new Employee
        {
            EmployeeId = Guid.NewGuid(),
            UserId = userId,
            FullName = fullName,
            Email = email,
            Department = department
        };
        db.Employees.Add(employee);
        return employee;
    }

    public static Requisition AddRequisition(
        AppDbContext db,
        Guid hiringManagerEmployeeId,
        string title = "Backend Engineer",
        string status = RequisitionStatuses.Draft,
        decimal? budgetMin = null,
        decimal? budgetMax = null)
    {
        var req = new Requisition
        {
            RequisitionId = Guid.NewGuid(),
            Title = title,
            Department = "Engineering",
            EmploymentType = "FullTime",
            Seniority = "Mid",
            Skills = "C#",
            JobDescription = "Build APIs",
            Status = status,
            HiringManagerEmployeeId = hiringManagerEmployeeId,
            BudgetMin = budgetMin,
            BudgetMax = budgetMax
        };
        db.Requisitions.Add(req);
        return req;
    }

    public static RequisitionTeamMember AddTeamMember(
        AppDbContext db,
        Guid requisitionId,
        Guid employeeId,
        string teamRole)
    {
        var member = new RequisitionTeamMember
        {
            RequisitionTeamMemberId = Guid.NewGuid(),
            RequisitionId = requisitionId,
            EmployeeId = employeeId,
            TeamRole = teamRole
        };
        db.RequisitionTeamMembers.Add(member);
        return member;
    }

    public static RequisitionService CreateRequisitionService(AppDbContext db) =>
        new(db, new RequisitionScopeService(db), new AuditService(db));
}
