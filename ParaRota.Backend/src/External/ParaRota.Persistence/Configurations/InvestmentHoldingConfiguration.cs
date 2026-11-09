using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class InvestmentHoldingConfiguration : IEntityTypeConfiguration<InvestmentHolding>
{
    public void Configure(EntityTypeBuilder<InvestmentHolding> builder)
    {
        builder.ToTable("InvestmentHoldings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssetType).IsRequired();
        builder.Property(x => x.FundCode).HasMaxLength(10);
        builder.Property(x => x.FundName).HasMaxLength(200);
        builder.Property(x => x.Quantity).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.InvestedAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.UnitPriceAtPurchase).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(3).HasDefaultValue("TRY").IsRequired();
        builder.Property(x => x.PurchaseDate).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(280);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        // Household FK — household silinince kayıt kişiselleşir (SetNull).
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);

        // Nakit bağlantısı — bağlı işlem silinirse holding kalır, bağ kopar (SetNull).
        builder.HasOne(x => x.LinkedTransaction)
               .WithMany()
               .HasForeignKey(x => x.LinkedTransactionId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.UserId, x.HouseholdId });
        builder.HasIndex(x => x.HouseholdId);
    }
}
