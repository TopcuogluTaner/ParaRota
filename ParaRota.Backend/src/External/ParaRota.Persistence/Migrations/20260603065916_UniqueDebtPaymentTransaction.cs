using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UniqueDebtPaymentTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DebtPayments_TransactionId",
                table: "DebtPayments");

            migrationBuilder.CreateIndex(
                name: "IX_DebtPayments_TransactionId",
                table: "DebtPayments",
                column: "TransactionId",
                unique: true,
                filter: "\"TransactionId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DebtPayments_TransactionId",
                table: "DebtPayments");

            migrationBuilder.CreateIndex(
                name: "IX_DebtPayments_TransactionId",
                table: "DebtPayments",
                column: "TransactionId");
        }
    }
}
