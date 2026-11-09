using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParaRota.Domain.Entities;

namespace ParaRota.Persistence.Configurations;

public class ErrorLogConfiguration : IEntityTypeConfiguration<ErrorLog>
{
    public void Configure(EntityTypeBuilder<ErrorLog> builder)
    {
        builder.ToTable("ErrorLogs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Message).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.StackTrace).HasColumnType("text");
        builder.Property(x => x.Source).HasMaxLength(255);
        builder.Property(x => x.RequestPath).HasMaxLength(500);
        builder.Property(x => x.RequestMethod).HasMaxLength(10);
        builder.Property(x => x.UserId).HasMaxLength(100);
        builder.Property(x => x.CreatedUser).HasMaxLength(100);
        builder.Property(x => x.EditUser).HasMaxLength(100);

        // Admin log paneli CreatedDate DESC sayfalıyor — tablo büyüdükçe full scan olmasın.
        builder.HasIndex(x => x.CreatedDate);
    }
}
