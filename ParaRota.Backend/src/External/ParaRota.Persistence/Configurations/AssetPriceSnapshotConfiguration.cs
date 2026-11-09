using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class AssetPriceSnapshotConfiguration : IEntityTypeConfiguration<AssetPriceSnapshot>
{
    public void Configure(EntityTypeBuilder<AssetPriceSnapshot> builder)
    {
        builder.ToTable("AssetPriceSnapshots");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssetType).IsRequired();
        builder.Property(x => x.FundCode).HasMaxLength(10);
        builder.Property(x => x.AsOf).IsRequired();
        builder.Property(x => x.BuyPrice).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.SellPrice).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(20).IsRequired();

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        // Aynı varlık × fon kodu × aynı an × aynı kaynak tek kayıt (idempotent upsert).
        // FundCode TEFAS dışı varlıklarda null. Postgres varsayılanında NULL'lar benzersiz
        // index'te birbirinden farklı sayılır → AreNullsDistinct(false) ile NULL=NULL kabul
        // edilir, böylece eski (AssetType,AsOf,Source) benzersizlik garantisi korunur (PG 15+).
        builder.HasIndex(x => new { x.AssetType, x.FundCode, x.AsOf, x.Source })
               .IsUnique()
               .AreNullsDistinct(false);
        // En güncel snapshot sorgusu için.
        builder.HasIndex(x => new { x.AssetType, x.FundCode, x.AsOf });
    }
}
