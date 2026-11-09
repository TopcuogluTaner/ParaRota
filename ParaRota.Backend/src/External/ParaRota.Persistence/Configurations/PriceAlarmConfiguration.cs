using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class PriceAlarmConfiguration : IEntityTypeConfiguration<PriceAlarm>
{
    public void Configure(EntityTypeBuilder<PriceAlarm> builder)
    {
        builder.ToTable("PriceAlarms");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssetType).HasConversion<int>().IsRequired();
        builder.Property(x => x.FundCode).HasMaxLength(10);
        builder.Property(x => x.FundName).HasMaxLength(200);
        builder.Property(x => x.Direction).HasConversion<int>().IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.ThresholdPrice).HasPrecision(18, 6).IsRequired();
        builder.Property(x => x.LastPrice).HasPrecision(18, 6);
        builder.Property(x => x.TriggeredPrice).HasPrecision(18, 6);
        builder.Property(x => x.Note).HasMaxLength(200);
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Household).WithMany().HasForeignKey(x => x.HouseholdId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.Status });
        // Hangfire kontrol job'u: aktif alarmları varlığa göre gruplar.
        builder.HasIndex(x => new { x.Status, x.AssetType }).HasFilter("\"IsDeleted\" = false");
    }
}
