using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Icon).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Emoji).HasMaxLength(16);
        builder.Property(x => x.Color).HasMaxLength(20);
        builder.Property(x => x.Type).HasConversion<int>().IsRequired();
        builder.Property(x => x.IsSystem).HasDefaultValue(false);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade)
               .IsRequired(false);

        builder.HasIndex(x => new { x.UserId, x.Type });
        builder.HasIndex(x => x.IsSystem);

        // Household FK (Faz 2C). Household silinince kayıt kişiselleşir (SetNull).
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => x.HouseholdId);

        // Household scope + tip filtresi hot path.
        builder.HasIndex(x => new { x.HouseholdId, x.Type })
               .HasFilter("\"IsDeleted\" = false");
    }
}
