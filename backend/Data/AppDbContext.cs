using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data.Entities;

namespace RecruitingAts.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Requisition> Requisitions => Set<Requisition>();
    public DbSet<RequisitionTeamMember> RequisitionTeamMembers => Set<RequisitionTeamMember>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<PipelineStage> PipelineStages => Set<PipelineStage>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<InterviewPanelMember> InterviewPanelMembers => Set<InterviewPanelMember>();
    public DbSet<InterviewFeedback> InterviewFeedbacks => Set<InterviewFeedback>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Employee>(e =>
        {
            e.HasKey(x => x.EmployeeId);
            e.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.Department).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Email);
            e.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");

            e.HasOne(x => x.User)
                .WithOne()
                .HasForeignKey<Employee>(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Requisition>(e =>
        {
            e.HasKey(x => x.RequisitionId);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Department).HasMaxLength(200).IsRequired();
            e.Property(x => x.EmploymentType).HasMaxLength(100).IsRequired();
            e.Property(x => x.Seniority).HasMaxLength(100).IsRequired();
            e.Property(x => x.Skills).HasMaxLength(1000).IsRequired();
            e.Property(x => x.JobDescription).IsRequired();
            e.Property(x => x.Status).HasMaxLength(50).IsRequired();
            e.Property(x => x.StatusReason).HasMaxLength(1000);
            e.Property(x => x.BudgetMin).HasPrecision(18, 2);
            e.Property(x => x.BudgetMax).HasPrecision(18, 2);

            e.HasOne(x => x.HiringManager)
                .WithMany(x => x.HiringManagerRequisitions)
                .HasForeignKey(x => x.HiringManagerEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RequisitionTeamMember>(e =>
        {
            e.HasKey(x => x.RequisitionTeamMemberId);
            e.Property(x => x.TeamRole).HasMaxLength(50).IsRequired();
            e.HasIndex(x => new { x.RequisitionId, x.EmployeeId }).IsUnique();

            e.HasOne(x => x.Requisition)
                .WithMany(x => x.TeamMembers)
                .HasForeignKey(x => x.RequisitionId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Employee)
                .WithMany(x => x.TeamMemberships)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Candidate>(e =>
        {
            e.HasKey(x => x.CandidateId);
            e.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(50).IsRequired();
            e.Property(x => x.Skills).HasMaxLength(1000);
            e.Property(x => x.ResumePath).HasMaxLength(500);
            e.Property(x => x.Source).HasMaxLength(100);
            e.HasIndex(x => x.Email);
            e.HasIndex(x => x.Phone);
            e.HasIndex(x => new { x.Email, x.Phone }).IsUnique();
        });

        builder.Entity<PipelineStage>(e =>
        {
            e.HasKey(x => x.PipelineStageId);
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.HasIndex(x => x.SortOrder);
        });

        builder.Entity<Application>(e =>
        {
            e.HasKey(x => x.ApplicationId);
            e.Property(x => x.Source).HasMaxLength(100);
            e.Property(x => x.DispositionReason).HasMaxLength(1000);
            e.Property(x => x.ExpectedSalary).HasPrecision(18, 2);
            e.HasIndex(x => new { x.CandidateId, x.RequisitionId }).IsUnique();

            e.HasOne(x => x.Candidate)
                .WithMany(x => x.Applications)
                .HasForeignKey(x => x.CandidateId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Requisition)
                .WithMany(x => x.Applications)
                .HasForeignKey(x => x.RequisitionId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.PipelineStage)
                .WithMany(x => x.Applications)
                .HasForeignKey(x => x.PipelineStageId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Interview>(e =>
        {
            e.HasKey(x => x.InterviewId);
            e.Property(x => x.InterviewType).HasMaxLength(100).IsRequired();
            e.Property(x => x.Mode).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(50).IsRequired();

            e.HasOne(x => x.Application)
                .WithMany(x => x.Interviews)
                .HasForeignKey(x => x.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<InterviewPanelMember>(e =>
        {
            e.HasKey(x => x.InterviewPanelMemberId);
            e.HasIndex(x => new { x.InterviewId, x.EmployeeId }).IsUnique();

            e.HasOne(x => x.Interview)
                .WithMany(x => x.PanelMembers)
                .HasForeignKey(x => x.InterviewId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Employee)
                .WithMany(x => x.InterviewPanelMemberships)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<InterviewFeedback>(e =>
        {
            e.HasKey(x => x.InterviewFeedbackId);
            e.Property(x => x.Strengths).IsRequired();
            e.Property(x => x.Concerns).IsRequired();
            e.Property(x => x.Recommendation).HasMaxLength(500).IsRequired();
            e.HasIndex(x => new { x.InterviewId, x.InterviewerEmployeeId }).IsUnique();

            e.HasOne(x => x.Interview)
                .WithMany(x => x.Feedbacks)
                .HasForeignKey(x => x.InterviewId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Interviewer)
                .WithMany(x => x.InterviewFeedbacks)
                .HasForeignKey(x => x.InterviewerEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.AuditLogId);
            e.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            e.Property(x => x.Action).HasMaxLength(100).IsRequired();
            e.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
            e.Property(x => x.EntityId).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Timestamp);
            e.HasIndex(x => new { x.EntityType, x.EntityId });

            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
