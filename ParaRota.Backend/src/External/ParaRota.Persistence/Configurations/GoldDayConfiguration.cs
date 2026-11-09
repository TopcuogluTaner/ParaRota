using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

// Soft-delete kullanıldığı için (Remove → IsDeleted=true) çocuk FK'leri Restrict; gerçek
// cascade tetiklenmez. Gün silinince çocuklar (üye/toplantı/katkı) serviste soft-silinir.

public class GoldDayConfiguration : IEntityTypeConfiguration<GoldDay>
{
    public void Configure(EntityTypeBuilder<GoldDay> builder)
    {
        builder.ToTable("GoldDays");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ContributionUnit).HasMaxLength(16).IsRequired();
        builder.Property(x => x.ContributionAmount).HasPrecision(18, 4).IsRequired();
        builder.Property(x => x.ContributionType).HasConversion<int>().IsRequired();
        builder.Property(x => x.Frequency).HasConversion<int>().IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.StartDate).IsRequired();
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Household).WithMany().HasForeignKey(x => x.HouseholdId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.Status });
        builder.HasIndex(x => new { x.HouseholdId, x.Status });
    }
}

public class GoldDayMemberConfiguration : IEntityTypeConfiguration<GoldDayMember>
{
    public void Configure(EntityTypeBuilder<GoldDayMember> builder)
    {
        builder.ToTable("GoldDayMembers");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.GoldDay).WithMany(g => g.Members).HasForeignKey(x => x.GoldDayId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.GoldDayId, x.Order });
    }
}

public class GoldDayMeetingConfiguration : IEntityTypeConfiguration<GoldDayMeeting>
{
    public void Configure(EntityTypeBuilder<GoldDayMeeting> builder)
    {
        builder.ToTable("GoldDayMeetings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.MeetingDate).IsRequired();
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.GoldDay).WithMany(g => g.Meetings).HasForeignKey(x => x.GoldDayId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.HostMember).WithMany().HasForeignKey(x => x.HostMemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.GoldDayId, x.SequenceNo });
        builder.HasIndex(x => new { x.IsCompleted, x.MeetingDate, x.LastReminderSentDate }).HasFilter("\"IsDeleted\" = false");
    }
}

public class GoldDayContributionConfiguration : IEntityTypeConfiguration<GoldDayContribution>
{
    public void Configure(EntityTypeBuilder<GoldDayContribution> builder)
    {
        builder.ToTable("GoldDayContributions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.Meeting).WithMany(m => m.Contributions).HasForeignKey(x => x.MeetingId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Member).WithMany().HasForeignKey(x => x.MemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.MeetingId);
    }
}
