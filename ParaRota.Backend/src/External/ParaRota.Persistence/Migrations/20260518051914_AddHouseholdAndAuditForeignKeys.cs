using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdAndAuditForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_HouseholdMembers_InvitedByUserId",
                table: "HouseholdMembers",
                column: "InvitedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdInvites_InvitedByUserId",
                table: "HouseholdInvites",
                column: "InvitedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Budgets_Households_HouseholdId",
                table: "Budgets",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Households_HouseholdId",
                table: "Categories",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Goals_Households_HouseholdId",
                table: "Goals",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_HouseholdInvites_Users_InvitedByUserId",
                table: "HouseholdInvites",
                column: "InvitedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_HouseholdMembers_Users_InvitedByUserId",
                table: "HouseholdMembers",
                column: "InvitedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Households_HouseholdId",
                table: "Notifications",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringRules_Households_HouseholdId",
                table: "RecurringRules",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Households_HouseholdId",
                table: "Transactions",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Budgets_Households_HouseholdId",
                table: "Budgets");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Households_HouseholdId",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_Goals_Households_HouseholdId",
                table: "Goals");

            migrationBuilder.DropForeignKey(
                name: "FK_HouseholdInvites_Users_InvitedByUserId",
                table: "HouseholdInvites");

            migrationBuilder.DropForeignKey(
                name: "FK_HouseholdMembers_Users_InvitedByUserId",
                table: "HouseholdMembers");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Households_HouseholdId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_RecurringRules_Households_HouseholdId",
                table: "RecurringRules");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Households_HouseholdId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_HouseholdMembers_InvitedByUserId",
                table: "HouseholdMembers");

            migrationBuilder.DropIndex(
                name: "IX_HouseholdInvites_InvitedByUserId",
                table: "HouseholdInvites");
        }
    }
}
