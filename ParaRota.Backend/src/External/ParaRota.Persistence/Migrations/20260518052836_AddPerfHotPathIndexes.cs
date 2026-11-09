using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerfHotPathIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId_TransactionDate_Type_Status_CategoryId",
                table: "Transactions",
                columns: new[] { "UserId", "TransactionDate", "Type", "Status", "CategoryId" },
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringRules_IsActive_NextRunDate_EndDate",
                table: "RecurringRules",
                columns: new[] { "IsActive", "NextRunDate", "EndDate" },
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdMembers_HouseholdId_Status_Role_JoinedAt",
                table: "HouseholdMembers",
                columns: new[] { "HouseholdId", "Status", "Role", "JoinedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdInvites_Status_ExpiresAt",
                table: "HouseholdInvites",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Debts_Status_NextDueDate_LastReminderSentDate",
                table: "Debts",
                columns: new[] { "Status", "NextDueDate", "LastReminderSentDate" },
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_HouseholdId_Type",
                table: "Categories",
                columns: new[] { "HouseholdId", "Type" },
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_UserId_Year_Month_CreatedDate",
                table: "Budgets",
                columns: new[] { "UserId", "Year", "Month", "CreatedDate" },
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_UserId_TransactionDate_Type_Status_CategoryId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_RecurringRules_IsActive_NextRunDate_EndDate",
                table: "RecurringRules");

            migrationBuilder.DropIndex(
                name: "IX_HouseholdMembers_HouseholdId_Status_Role_JoinedAt",
                table: "HouseholdMembers");

            migrationBuilder.DropIndex(
                name: "IX_HouseholdInvites_Status_ExpiresAt",
                table: "HouseholdInvites");

            migrationBuilder.DropIndex(
                name: "IX_Debts_Status_NextDueDate_LastReminderSentDate",
                table: "Debts");

            migrationBuilder.DropIndex(
                name: "IX_Categories_HouseholdId_Type",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_UserId_Year_Month_CreatedDate",
                table: "Budgets");
        }
    }
}
