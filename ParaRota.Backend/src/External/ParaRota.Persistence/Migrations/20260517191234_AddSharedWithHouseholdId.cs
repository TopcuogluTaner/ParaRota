using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSharedWithHouseholdId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SharedWithHouseholdId",
                table: "Transactions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SharedWithHouseholdId",
                table: "RecurringRules",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SharedWithHouseholdId",
                table: "Goals",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SharedWithHouseholdId",
                table: "Debts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SharedWithHouseholdId",
                table: "Categories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SharedWithHouseholdId",
                table: "Budgets",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_SharedWithHouseholdId",
                table: "Transactions",
                column: "SharedWithHouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringRules_SharedWithHouseholdId",
                table: "RecurringRules",
                column: "SharedWithHouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Goals_SharedWithHouseholdId",
                table: "Goals",
                column: "SharedWithHouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Debts_SharedWithHouseholdId",
                table: "Debts",
                column: "SharedWithHouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_SharedWithHouseholdId",
                table: "Categories",
                column: "SharedWithHouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_SharedWithHouseholdId",
                table: "Budgets",
                column: "SharedWithHouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_Budgets_Households_SharedWithHouseholdId",
                table: "Budgets",
                column: "SharedWithHouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Households_SharedWithHouseholdId",
                table: "Categories",
                column: "SharedWithHouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Debts_Households_SharedWithHouseholdId",
                table: "Debts",
                column: "SharedWithHouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Goals_Households_SharedWithHouseholdId",
                table: "Goals",
                column: "SharedWithHouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringRules_Households_SharedWithHouseholdId",
                table: "RecurringRules",
                column: "SharedWithHouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Households_SharedWithHouseholdId",
                table: "Transactions",
                column: "SharedWithHouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Budgets_Households_SharedWithHouseholdId",
                table: "Budgets");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Households_SharedWithHouseholdId",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_Debts_Households_SharedWithHouseholdId",
                table: "Debts");

            migrationBuilder.DropForeignKey(
                name: "FK_Goals_Households_SharedWithHouseholdId",
                table: "Goals");

            migrationBuilder.DropForeignKey(
                name: "FK_RecurringRules_Households_SharedWithHouseholdId",
                table: "RecurringRules");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Households_SharedWithHouseholdId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_SharedWithHouseholdId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_RecurringRules_SharedWithHouseholdId",
                table: "RecurringRules");

            migrationBuilder.DropIndex(
                name: "IX_Goals_SharedWithHouseholdId",
                table: "Goals");

            migrationBuilder.DropIndex(
                name: "IX_Debts_SharedWithHouseholdId",
                table: "Debts");

            migrationBuilder.DropIndex(
                name: "IX_Categories_SharedWithHouseholdId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_SharedWithHouseholdId",
                table: "Budgets");

            migrationBuilder.DropColumn(
                name: "SharedWithHouseholdId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SharedWithHouseholdId",
                table: "RecurringRules");

            migrationBuilder.DropColumn(
                name: "SharedWithHouseholdId",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "SharedWithHouseholdId",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "SharedWithHouseholdId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "SharedWithHouseholdId",
                table: "Budgets");
        }
    }
}
