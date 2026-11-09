using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ParaRota.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionsAndTrial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TrialEndsAt",
                table: "Users",
                type: "timestamp without time zone",
                nullable: true);

            // Paywall lansman backfill: mevcut kullanıcılara da 30 günlük uygulama denemesi tanı.
            // TrialEndsAt = max(CreatedDate, paywallLaunchDate) + 30 gün. Lansman tarihi 2026-06-09.
            // Yeni kayıtlar zaten AuthService'te TrialEndsAt ile gelir; burası yalnız eski satırlar için.
            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "TrialEndsAt" = GREATEST("CreatedDate", TIMESTAMP '2026-06-09 00:00:00') + INTERVAL '30 days'
                WHERE "TrialEndsAt" IS NULL;
                """);

            migrationBuilder.CreateTable(
                name: "UserSubscriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Store = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EntitlementId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "premium"),
                    PeriodType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    WillRenew = table.Column<bool>(type: "boolean", nullable: false),
                    RcAppUserId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    OriginalTransactionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LastEventAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EditDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedUser = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EditUser = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSubscriptions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_ExpiresAt",
                table: "UserSubscriptions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_UserId",
                table: "UserSubscriptions",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserSubscriptions");

            migrationBuilder.DropColumn(
                name: "TrialEndsAt",
                table: "Users");
        }
    }
}
