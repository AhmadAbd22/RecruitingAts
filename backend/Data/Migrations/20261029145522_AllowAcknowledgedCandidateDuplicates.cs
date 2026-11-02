using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecruitingAts.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowAcknowledgedCandidateDuplicates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidates_Email",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Email",
                table: "Candidates",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Email_Phone",
                table: "Candidates",
                columns: new[] { "Email", "Phone" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates",
                column: "Phone");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidates_Email",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_Email_Phone",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Email",
                table: "Candidates",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates",
                column: "Phone",
                unique: true);
        }
    }
}
