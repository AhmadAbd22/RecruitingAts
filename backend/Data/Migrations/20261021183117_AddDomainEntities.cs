using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecruitingAts.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    AuditLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.AuditLogId);
                    table.ForeignKey(
                        name: "FK_AuditLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Candidates",
                columns: table => new
                {
                    CandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Skills = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ResumePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Source = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ConsentDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candidates", x => x.CandidateId);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.EmployeeId);
                    table.ForeignKey(
                        name: "FK_Employees_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PipelineStages",
                columns: table => new
                {
                    PipelineStageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsReserved = table.Column<bool>(type: "bit", nullable: false),
                    IsTerminal = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PipelineStages", x => x.PipelineStageId);
                });

            migrationBuilder.CreateTable(
                name: "Requisitions",
                columns: table => new
                {
                    RequisitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EmploymentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Seniority = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Skills = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    JobDescription = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Openings = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    HiringManagerEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BudgetMin = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    BudgetMax = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    StatusReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Requisitions", x => x.RequisitionId);
                    table.ForeignKey(
                        name: "FK_Requisitions_Employees_HiringManagerEmployeeId",
                        column: x => x.HiringManagerEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Applications",
                columns: table => new
                {
                    ApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequisitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PipelineStageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DispositionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExpectedSalary = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Applications", x => x.ApplicationId);
                    table.ForeignKey(
                        name: "FK_Applications_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "CandidateId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Applications_PipelineStages_PipelineStageId",
                        column: x => x.PipelineStageId,
                        principalTable: "PipelineStages",
                        principalColumn: "PipelineStageId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Applications_Requisitions_RequisitionId",
                        column: x => x.RequisitionId,
                        principalTable: "Requisitions",
                        principalColumn: "RequisitionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RequisitionTeamMembers",
                columns: table => new
                {
                    RequisitionTeamMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequisitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamRole = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequisitionTeamMembers", x => x.RequisitionTeamMemberId);
                    table.ForeignKey(
                        name: "FK_RequisitionTeamMembers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RequisitionTeamMembers_Requisitions_RequisitionId",
                        column: x => x.RequisitionId,
                        principalTable: "Requisitions",
                        principalColumn: "RequisitionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Interviews",
                columns: table => new
                {
                    InterviewId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterviewType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CalendarEmailLog = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Interviews", x => x.InterviewId);
                    table.ForeignKey(
                        name: "FK_Interviews_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "ApplicationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InterviewFeedbacks",
                columns: table => new
                {
                    InterviewFeedbackId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterviewId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterviewerEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Strengths = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Concerns = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Recommendation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewFeedbacks", x => x.InterviewFeedbackId);
                    table.ForeignKey(
                        name: "FK_InterviewFeedbacks_Employees_InterviewerEmployeeId",
                        column: x => x.InterviewerEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InterviewFeedbacks_Interviews_InterviewId",
                        column: x => x.InterviewId,
                        principalTable: "Interviews",
                        principalColumn: "InterviewId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InterviewPanelMembers",
                columns: table => new
                {
                    InterviewPanelMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterviewId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsLead = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewPanelMembers", x => x.InterviewPanelMemberId);
                    table.ForeignKey(
                        name: "FK_InterviewPanelMembers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InterviewPanelMembers_Interviews_InterviewId",
                        column: x => x.InterviewId,
                        principalTable: "Interviews",
                        principalColumn: "InterviewId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Applications_CandidateId_RequisitionId",
                table: "Applications",
                columns: new[] { "CandidateId", "RequisitionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Applications_PipelineStageId",
                table: "Applications",
                column: "PipelineStageId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_RequisitionId",
                table: "Applications",
                column: "RequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityType_EntityId",
                table: "AuditLogs",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp",
                table: "AuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Email",
                table: "Candidates",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates",
                column: "Phone",
                unique: true,
                filter: "[Phone] IS NOT NULL AND [Phone] <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_UserId",
                table: "Employees",
                column: "UserId",
                unique: true,
                filter: "[UserId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewFeedbacks_InterviewerEmployeeId",
                table: "InterviewFeedbacks",
                column: "InterviewerEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewFeedbacks_InterviewId_InterviewerEmployeeId",
                table: "InterviewFeedbacks",
                columns: new[] { "InterviewId", "InterviewerEmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InterviewPanelMembers_EmployeeId",
                table: "InterviewPanelMembers",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewPanelMembers_InterviewId_EmployeeId",
                table: "InterviewPanelMembers",
                columns: new[] { "InterviewId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Interviews_ApplicationId",
                table: "Interviews",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_PipelineStages_Name",
                table: "PipelineStages",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PipelineStages_SortOrder",
                table: "PipelineStages",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_Requisitions_HiringManagerEmployeeId",
                table: "Requisitions",
                column: "HiringManagerEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_RequisitionTeamMembers_EmployeeId",
                table: "RequisitionTeamMembers",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_RequisitionTeamMembers_RequisitionId_EmployeeId",
                table: "RequisitionTeamMembers",
                columns: new[] { "RequisitionId", "EmployeeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "InterviewFeedbacks");

            migrationBuilder.DropTable(
                name: "InterviewPanelMembers");

            migrationBuilder.DropTable(
                name: "RequisitionTeamMembers");

            migrationBuilder.DropTable(
                name: "Interviews");

            migrationBuilder.DropTable(
                name: "Applications");

            migrationBuilder.DropTable(
                name: "Candidates");

            migrationBuilder.DropTable(
                name: "PipelineStages");

            migrationBuilder.DropTable(
                name: "Requisitions");

            migrationBuilder.DropTable(
                name: "Employees");
        }
    }
}
