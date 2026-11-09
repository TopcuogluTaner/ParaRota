using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.ToTable("Goals");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.TargetAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.CurrentAmount).HasPrecision(18, 2).HasDefaultValue(0m).IsRequired();
        builder.Property(x => x.TargetDate).IsRequired();
        builder.Property(x => x.Priority).IsRequired();
        builder.Property(x => x.Status).IsRequired();
        builder.Property(x => x.Emoji).HasMaxLength(8);
        builder.Property(x => x.Currency).HasMaxLength(3).HasDefaultValue("TRY").IsRequired();

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.Status });

        // Household FK (Faz 2C). Household silinince kayıt kişiselleşir (SetNull).
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => x.HouseholdId);
    }
}
