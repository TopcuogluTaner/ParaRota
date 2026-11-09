using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInstallmentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InstallmentCount",
                table: "RecurringRules",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InstallmentTotalAmount",
                table: "RecurringRules",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InstallmentCount",
                table: "RecurringRules");

            migrationBuilder.DropColumn(
                name: "InstallmentTotalAmount",
                table: "RecurringRules");
        }
    }
}
