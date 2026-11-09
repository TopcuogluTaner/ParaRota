using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

// Soft-delete (Remove → IsDeleted=true) kullanıldığından çocuk FK'leri Restrict; kasa silinince
// çocuklar (üye/masraf/pay/ödeme) serviste soft-silinir. Birden çok FK aynı tabloya (üye→from/to,
// masraf→payer) gittiğinden Restrict ayrıca çoklu-cascade-path hatasını da önler.

public class SharedPotConfiguration : IEntityTypeConfiguration<SharedPot>
{
    public void Configure(EntityTypeBuilder<SharedPot> builder)
    {
        builder.ToTable("SharedPots");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(8).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Household).WithMany().HasForeignKey(x => x.HouseholdId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.Status });
        builder.HasIndex(x => new { x.HouseholdId, x.Status });
    }
}

public class SharedPotMemberConfiguration : IEntityTypeConfiguration<SharedPotMember>
{
    public void Configure(EntityTypeBuilder<SharedPotMember> builder)
    {
        builder.ToTable("SharedPotMembers");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.SharedPot).WithMany(p => p.Members).HasForeignKey(x => x.SharedPotId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.LinkedUser).WithMany().HasForeignKey(x => x.LinkedUserId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.SharedPotId);
        builder.HasIndex(x => new { x.SharedPotId, x.LinkedUserId });
    }
}

public class SharedExpenseConfiguration : IEntityTypeConfiguration<SharedExpense>
{
    public void Configure(EntityTypeBuilder<SharedExpense> builder)
    {
        builder.ToTable("SharedExpenses");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Description).HasMaxLength(160).IsRequired();
        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.ExpenseDate).IsRequired();
        builder.Property(x => x.SplitType).HasConversion<int>().IsRequired();
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.SharedPot).WithMany(p => p.Expenses).HasForeignKey(x => x.SharedPotId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.PayerMember).WithMany().HasForeignKey(x => x.PayerMemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.SharedPotId);
    }
}

public class SharedExpenseShareConfiguration : IEntityTypeConfiguration<SharedExpenseShare>
{
    public void Configure(EntityTypeBuilder<SharedExpenseShare> builder)
    {
        builder.ToTable("SharedExpenseShares");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ShareAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.SharedExpense).WithMany(e => e.Shares).HasForeignKey(x => x.SharedExpenseId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Member).WithMany().HasForeignKey(x => x.MemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.SharedExpenseId);
        builder.HasIndex(x => x.MemberId);
    }
}

public class SharedSettlementConfiguration : IEntityTypeConfiguration<SharedSettlement>
{
    public void Configure(EntityTypeBuilder<SharedSettlement> builder)
    {
        builder.ToTable("SharedSettlements");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.SettledOn).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.SharedPot).WithMany(p => p.Settlements).HasForeignKey(x => x.SharedPotId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.FromMember).WithMany().HasForeignKey(x => x.FromMemberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ToMember).WithMany().HasForeignKey(x => x.ToMemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.SharedPotId);
    }
}
