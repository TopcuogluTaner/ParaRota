using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class DebtPaymentConfiguration : IEntityTypeConfiguration<DebtPayment>
{
    public void Configure(EntityTypeBuilder<DebtPayment> builder)
    {
        builder.ToTable("DebtPayments");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.PaymentDate).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(300);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.Debt)
               .WithMany(d => d.Payments)
               .HasForeignKey(x => x.DebtId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Transaction)
               .WithMany()
               .HasForeignKey(x => x.TransactionId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.DebtId, x.PaymentDate });

        // Bir Transaction'a en fazla BİR ödeme bağlanabilir. Auto-mod borç senkronu (RunDueAsync
        // SyncLinkedDebtAsync) eşzamanlı çalışabildiği için ("run now" + Hangfire) bu DB-seviyesi
        // guard çift ödemeyi imkânsız kılar; uygulama-seviyesi dedup tek başına yarış-güvenli değil.
        builder.HasIndex(x => x.TransactionId)
               .IsUnique()
               .HasFilter("\"TransactionId\" IS NOT NULL");
    }
}
