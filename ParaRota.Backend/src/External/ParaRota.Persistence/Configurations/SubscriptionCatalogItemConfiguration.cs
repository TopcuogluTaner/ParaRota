using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class SubscriptionCatalogItemConfiguration : IEntityTypeConfiguration<SubscriptionCatalogItem>
{
    public void Configure(EntityTypeBuilder<SubscriptionCatalogItem> builder)
    {
        builder.ToTable("SubscriptionCatalogItems");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Key).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Icon).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Color).HasMaxLength(20).IsRequired();
        builder.Property(x => x.SuggestedAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Frequency).HasMaxLength(20).IsRequired();

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasIndex(x => x.Key).IsUnique();
        builder.HasIndex(x => new { x.IsActive, x.SortOrder });
    }
}
