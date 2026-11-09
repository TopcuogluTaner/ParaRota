using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class UserSubscriptionConfiguration : IEntityTypeConfiguration<UserSubscription>
{
    public void Configure(EntityTypeBuilder<UserSubscription> builder)
    {
        builder.ToTable("UserSubscriptions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status).IsRequired();
        builder.Property(x => x.Store).IsRequired();
        builder.Property(x => x.ProductId).HasMaxLength(200);
        builder.Property(x => x.EntitlementId).HasMaxLength(100).HasDefaultValue("premium").IsRequired();
        builder.Property(x => x.PeriodType).HasMaxLength(50);
        builder.Property(x => x.RcAppUserId).HasMaxLength(200);
        builder.Property(x => x.LastEventId).HasMaxLength(100);
        builder.Property(x => x.OriginalTransactionId).HasMaxLength(200);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        // Kullanıcı başına tek satır (upsert). Soft-delete global filter ile birlikte
        // çalışır; aktif (silinmemiş) satırlar arasında benzersizlik garanti edilir.
        builder.HasIndex(x => x.UserId).IsUnique();
        builder.HasIndex(x => x.ExpiresAt);
    }
}
