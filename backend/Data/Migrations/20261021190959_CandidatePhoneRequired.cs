using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecruitingAts.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CandidatePhoneRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Candidates",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates",
                column: "Phone",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Candidates",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_Phone",
                table: "Candidates",
                column: "Phone",
                unique: true,
                filter: "[Phone] IS NOT NULL AND [Phone] <> ''");
        }
    }
}
