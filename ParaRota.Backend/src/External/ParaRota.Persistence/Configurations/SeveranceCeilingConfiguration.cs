using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class SeveranceCeilingConfiguration : IEntityTypeConfiguration<SeveranceCeiling>
{
    public void Configure(EntityTypeBuilder<SeveranceCeiling> builder)
    {
        builder.ToTable("SeveranceCeilings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(120);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        // Bir başlangıç tarihi için tek tavan; seed idempotency + admin "çakışan tarih" guard'ı bununla.
        builder.HasIndex(x => x.EffectiveFrom).IsUnique();
    }
}
