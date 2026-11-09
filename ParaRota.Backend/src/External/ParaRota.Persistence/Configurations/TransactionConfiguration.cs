using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type).HasConversion<int>().IsRequired();
        builder.Property(x => x.Nature).HasConversion<int>().IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.Source).HasConversion<int>().IsRequired();

        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired().HasDefaultValue("TRY");

        builder.Property(x => x.PaidVia).HasConversion<int?>();

        builder.Property(x => x.TransactionDate).IsRequired();

        builder.Property(x => x.Notes).HasMaxLength(500);
        builder.Property(x => x.ReceiptUrl).HasMaxLength(500);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Category)
               .WithMany(c => c.Transactions)
               .HasForeignKey(x => x.CategoryId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RecurringRule)
               .WithMany(r => r.Transactions)
               .HasForeignKey(x => x.RecurringRuleId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.UserId, x.TransactionDate });
        builder.HasIndex(x => new { x.UserId, x.Type, x.Status });
        builder.HasIndex(x => x.CategoryId);
        builder.HasIndex(x => x.RecurringRuleId);

        // Household FK (Faz 2C). Household silinince kayıt kişiselleşir (SetNull) — kullanıcı verisi korunur.
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => x.HouseholdId);

        // Aynı RecurringRule + aynı gün için tekrar Transaction üretilmesin (idempotency).
        builder.HasIndex(x => new { x.RecurringRuleId, x.TransactionDate })
               .IsUnique()
               .HasFilter("\"RecurringRuleId\" IS NOT NULL");

        // Listing/dashboard hot path: compound + partial soft-delete.
        builder.HasIndex(x => new { x.UserId, x.TransactionDate, x.Type, x.Status, x.CategoryId })
               .HasFilter("\"IsDeleted\" = false");

        // Aile scope'u listing/agregasyon hot path'i — kişisel muadili üstteki compound;
        // aile sorguları HouseholdId + tarih ile filtreler, tekil HouseholdId index'i yetmez.
        builder.HasIndex(x => new { x.HouseholdId, x.TransactionDate, x.Type, x.Status })
               .HasFilter("\"IsDeleted\" = false AND \"HouseholdId\" IS NOT NULL");
    }
}
