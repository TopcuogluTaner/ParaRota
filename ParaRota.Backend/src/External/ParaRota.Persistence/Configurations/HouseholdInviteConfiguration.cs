using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class HouseholdInviteConfiguration : IEntityTypeConfiguration<HouseholdInvite>
{
    public void Configure(EntityTypeBuilder<HouseholdInvite> builder)
    {
        builder.ToTable("HouseholdInvites");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Email).HasMaxLength(255).IsRequired();
        builder.Property(x => x.Token).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ExpiresAt).IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.Household)
               .WithMany(h => h.Invites)
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.Cascade);

        // Daveti gönderen kullanıcı zorunlu — silinmeye karşı korunur (Restrict).
        builder.HasOne<AppUser>()
               .WithMany()
               .HasForeignKey(x => x.InvitedByUserId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Token).IsUnique();
        builder.HasIndex(x => new { x.HouseholdId, x.Email, x.Status });
        builder.HasIndex(x => x.InvitedByUserId);

        // Hangfire expire job: pending + süresi geçmiş davetler.
        builder.HasIndex(x => new { x.Status, x.ExpiresAt });
    }
}
