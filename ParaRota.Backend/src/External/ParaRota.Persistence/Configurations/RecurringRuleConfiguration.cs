using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class RecurringRuleConfiguration : IEntityTypeConfiguration<RecurringRule>
{
    public void Configure(EntityTypeBuilder<RecurringRule> builder)
    {
        builder.ToTable("RecurringRules");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Description).HasMaxLength(200).IsRequired();

        builder.Property(x => x.Type).HasConversion<int>().IsRequired();
        builder.Property(x => x.Nature).HasConversion<int>().IsRequired();
        builder.Property(x => x.Frequency).HasConversion<int>().IsRequired();

        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.PayrollGrossMonthly).HasPrecision(18, 2);
        builder.Property(x => x.InstallmentTotalAmount).HasPrecision(18, 2);
        builder.Property(x => x.PayrollGrossHistory).HasColumnType("jsonb");
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired().HasDefaultValue("TRY");

        builder.Property(x => x.StartDate).IsRequired();
        builder.Property(x => x.NextRunDate).IsRequired();

        builder.Property(x => x.AutoApprove).HasDefaultValue(false);
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.Property(x => x.Notes).HasMaxLength(500);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Category)
               .WithMany(c => c.RecurringRules)
               .HasForeignKey(x => x.CategoryId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.IsActive });
        builder.HasIndex(x => new { x.IsActive, x.NextRunDate });

        // Hangfire daily job: (IsActive, NextRunDate, EndDate) compound.
        builder.HasIndex(x => new { x.IsActive, x.NextRunDate, x.EndDate })
               .HasFilter("\"IsDeleted\" = false");

        // Household FK (Faz 2C). Household silinince kayıt kişiselleşir (SetNull).
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => x.HouseholdId);
    }
}
