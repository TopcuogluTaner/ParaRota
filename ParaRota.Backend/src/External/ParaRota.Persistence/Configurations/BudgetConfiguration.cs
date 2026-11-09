using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("Budgets");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.MonthlyLimit).HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.Month).IsRequired();
        builder.Property(x => x.Year).IsRequired();
        builder.Property(x => x.WarnThreshold).HasDefaultValue(80);

        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Category)
               .WithMany()
               .HasForeignKey(x => x.CategoryId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.UserId, x.Year, x.Month });

        // Household FK (Faz 2C). Household silinince kayıt kişiselleşir (SetNull).
        builder.HasOne<Household>()
               .WithMany()
               .HasForeignKey(x => x.HouseholdId)
               .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => x.HouseholdId);

        // Aynı kategori/ay için scope başına tek bütçe. İki partial unique index:
        // - Kişisel (HouseholdId NULL): kullanıcı bazlı.
        // - Aile (HouseholdId dolu): household bazlı (kişisel + aile bütçe aynı kategori/ayda bir arada yaşayabilir).
        // Her ikisi de IsDeleted=false filtreli — soft-delete edilmiş satır unique slot'u işgal etmesin
        // (sil→tekrar oluştur ve merge sonrası 23505 engellenir).
        builder.HasIndex(x => new { x.UserId, x.CategoryId, x.Year, x.Month })
               .IsUnique()
               .HasFilter("\"HouseholdId\" IS NULL AND \"IsDeleted\" = false");
        builder.HasIndex(x => new { x.HouseholdId, x.CategoryId, x.Year, x.Month })
               .IsUnique()
               .HasFilter("\"HouseholdId\" IS NOT NULL AND \"IsDeleted\" = false");

        // Listing/sıralama hot path: (User, Year, Month) compound + partial soft-delete.
        builder.HasIndex(x => new { x.UserId, x.Year, x.Month, x.CreatedDate })
               .HasFilter("\"IsDeleted\" = false");
    }
}
