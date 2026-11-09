using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class DebtConfiguration : IEntityTypeConfiguration<Debt>
{
    public void Configure(EntityTypeBuilder<Debt> builder)
    {
        builder.ToTable("Debts");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.CounterpartyName).HasMaxLength(120).IsRequired();

        builder.Property(x => x.Kind).HasConversion<int>().IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.PaymentMode).HasConversion<int>().IsRequired();
        builder.Property(x => x.InstallmentFrequency).HasConversion<int?>();

        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.RemainingAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.InterestRate).HasPrecision(5, 2);

        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired().HasDefaultValue("TRY");

        builder.Property(x => x.StartDate).IsRequired();

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Household)
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.LinkedRecurringRule)
               .WithMany()
               .HasForeignKey(x => x.LinkedRecurringRuleId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.UserId, x.Status });
        builder.HasIndex(x => new { x.HouseholdId, x.Status });
        builder.HasIndex(x => x.NextDueDate);

        // Hangfire daily reminder job: aktif borçlar + vadesi yakın + bugün hatırlatılmamış.
        builder.HasIndex(x => new { x.Status, x.NextDueDate, x.LastReminderSentDate })
               .HasFilter("\"IsDeleted\" = false");
    }
}
