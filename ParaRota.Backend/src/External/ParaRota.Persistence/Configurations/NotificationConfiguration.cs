using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type).HasConversion<int>().IsRequired();
        builder.Property(x => x.Severity).HasConversion<int>().IsRequired();

        builder.Property(x => x.TitleKey).HasMaxLength(100).IsRequired();
        builder.Property(x => x.MessageKey).HasMaxLength(200).IsRequired();

        // Postgres native JSON sütunu — interpolation anahtarları için.
        builder.Property(x => x.Payload).HasColumnType("jsonb");

        builder.Property(x => x.RefType).HasMaxLength(32);
        builder.Property(x => x.DedupKey).HasMaxLength(128);

        builder.Property(x => x.IsRead).HasDefaultValue(false);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        // Household FK. Household silinirse bildirim kişiselleşir (SetNull).
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);

        // Unread sayma + son N listeleme için hızlı index.
        builder.HasIndex(x => new { x.UserId, x.IsRead, x.CreatedDate });

        // Idempotency: DedupKey verilirse (UserId, DedupKey) unique olmalı. NULL'lara uygulanmaz.
        builder.HasIndex(x => new { x.UserId, x.DedupKey })
               .IsUnique()
               .HasFilter("\"DedupKey\" IS NOT NULL");

        builder.HasIndex(x => x.HouseholdId);
    }
}
