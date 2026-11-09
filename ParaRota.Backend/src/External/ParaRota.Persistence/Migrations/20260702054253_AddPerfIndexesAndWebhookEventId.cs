using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerfIndexesAndWebhookEventId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastEventId",
                table: "UserSubscriptions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_HouseholdId_TransactionDate_Type_Status",
                table: "Transactions",
                columns: new[] { "HouseholdId", "TransactionDate", "Type", "Status" },
                filter: "\"IsDeleted\" = false AND \"HouseholdId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ErrorLogs_CreatedDate",
                table: "ErrorLogs",
                column: "CreatedDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_HouseholdId_TransactionDate_Type_Status",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_ErrorLogs_CreatedDate",
                table: "ErrorLogs");

            migrationBuilder.DropColumn(
                name: "LastEventId",
                table: "UserSubscriptions");
        }
    }
}
