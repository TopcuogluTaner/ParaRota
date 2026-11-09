using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class HouseholdMemberConfiguration : IEntityTypeConfiguration<HouseholdMember>
{
    public void Configure(EntityTypeBuilder<HouseholdMember> builder)
    {
        builder.ToTable("HouseholdMembers");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Role).HasConversion<int>().IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.JoinedAt).IsRequired();

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.Household)
               .WithMany(h => h.Members)
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        // Daveti yapan kullanıcı silinirse audit referansı NULL'a düşer.
        builder.HasOne<AppUser>()
               .WithMany()
               .HasForeignKey(x => x.InvitedByUserId)
               .OnDelete(DeleteBehavior.SetNull);

        // Bir user, bir household'da en fazla bir kez bulunmalı.
        builder.HasIndex(x => new { x.HouseholdId, x.UserId }).IsUnique();
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.InvitedByUserId);

        // GetMembers + IsActiveMember hot path: scope + rol sıralı listeleme.
        builder.HasIndex(x => new { x.HouseholdId, x.Status, x.Role, x.JoinedAt });
    }
}
