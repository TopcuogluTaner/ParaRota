using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryEmojiAndHouseholdId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Emoji",
                table: "Categories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Categories",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_HouseholdId",
                table: "Categories",
                column: "HouseholdId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Categories_HouseholdId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Emoji",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Categories");
        }
    }
}
