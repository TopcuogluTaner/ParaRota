using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTefasFunds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AssetPriceSnapshots_AssetType_AsOf",
                table: "AssetPriceSnapshots");

            migrationBuilder.DropIndex(
                name: "IX_AssetPriceSnapshots_AssetType_AsOf_Source",
                table: "AssetPriceSnapshots");

            migrationBuilder.AddColumn<string>(
                name: "FundCode",
                table: "PriceAlarms",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FundName",
                table: "PriceAlarms",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FundCode",
                table: "InvestmentHoldings",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FundName",
                table: "InvestmentHoldings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FundCode",
                table: "AssetPriceSnapshots",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssetPriceSnapshots_AssetType_FundCode_AsOf",
                table: "AssetPriceSnapshots",
                columns: new[] { "AssetType", "FundCode", "AsOf" });

            migrationBuilder.CreateIndex(
                name: "IX_AssetPriceSnapshots_AssetType_FundCode_AsOf_Source",
                table: "AssetPriceSnapshots",
                columns: new[] { "AssetType", "FundCode", "AsOf", "Source" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AssetPriceSnapshots_AssetType_FundCode_AsOf",
                table: "AssetPriceSnapshots");

            migrationBuilder.DropIndex(
                name: "IX_AssetPriceSnapshots_AssetType_FundCode_AsOf_Source",
                table: "AssetPriceSnapshots");

            migrationBuilder.DropColumn(
                name: "FundCode",
                table: "PriceAlarms");

            migrationBuilder.DropColumn(
                name: "FundName",
                table: "PriceAlarms");

            migrationBuilder.DropColumn(
                name: "FundCode",
                table: "InvestmentHoldings");

            migrationBuilder.DropColumn(
                name: "FundName",
                table: "InvestmentHoldings");

            migrationBuilder.DropColumn(
                name: "FundCode",
                table: "AssetPriceSnapshots");

            migrationBuilder.CreateIndex(
                name: "IX_AssetPriceSnapshots_AssetType_AsOf",
                table: "AssetPriceSnapshots",
                columns: new[] { "AssetType", "AsOf" });

            migrationBuilder.CreateIndex(
                name: "IX_AssetPriceSnapshots_AssetType_AsOf_Source",
                table: "AssetPriceSnapshots",
                columns: new[] { "AssetType", "AsOf", "Source" },
                unique: true);
        }
    }
}
