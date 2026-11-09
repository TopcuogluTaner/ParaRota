using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Payroll;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class SeveranceCeilingService(AppDbContext context) : ISeveranceCeilingService
{
    /// <summary>
    /// Bilinen tavan dönemleri (seed). Resmi fiyat API'si yok; yeni dönem (Temmuz/Ocak)
    /// açıklanınca admin panelinden eklenir — buraya dokunmak gerekmez. Seed EffectiveFrom
    /// bazlı idempotent: admin'in panelden düzenlediği değerleri EZMEZ.
    /// </summary>
    private static readonly (DateTime EffectiveFrom, decimal Amount, string Note)[] SeedDefaults =
    [
        (new DateTime(2026, 1, 1), 64948.77m, "2026 H1 (01.01–30.06.2026)"),
    ];

    public async Task<IReadOnlyList<SeveranceCeilingPeriod>> GetPeriodsAsync(CancellationToken cancellationToken = default)
    {
        return await context.SeveranceCeilings.AsNoTracking()
            .OrderBy(x => x.EffectiveFrom)
            .Select(x => new SeveranceCeilingPeriod(x.EffectiveFrom, x.Amount))
            .ToListAsync(cancellationToken);
    }

    public async Task<ApiResponse<IReadOnlyList<SeveranceCeilingDto>>> AdminListAsync(CancellationToken cancellationToken = default)
    {
        var items = await context.SeveranceCeilings.AsNoTracking()
            .OrderByDescending(x => x.EffectiveFrom)
            .ToListAsync(cancellationToken);

        return ApiResponse<IReadOnlyList<SeveranceCeilingDto>>.Success(items.Select(Map).ToList());
    }

    public async Task<ApiResponse<SeveranceCeilingDto>> AdminCreateAsync(CreateSeveranceCeilingDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Amount <= 0 || dto.EffectiveFrom == default || dto.EffectiveFrom.Year < 2000)
            return ApiResponse<SeveranceCeilingDto>.Fail("Geçerli bir tavan tutarı ve tarih gerekli.", 400, errorCode: ErrorCodes.SeveranceCeilingInvalid);

        var effectiveFrom = dto.EffectiveFrom.Date;
        var exists = await context.SeveranceCeilings.AnyAsync(x => x.EffectiveFrom == effectiveFrom, cancellationToken);
        if (exists)
            return ApiResponse<SeveranceCeilingDto>.Fail("Bu yürürlük tarihi için bir tavan zaten var.", 409, errorCode: ErrorCodes.SeveranceCeilingDateExists);

        var entity = new SeveranceCeiling
        {
            EffectiveFrom = effectiveFrom,
            Amount = dto.Amount,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
        };

        await context.SeveranceCeilings.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<SeveranceCeilingDto>.Success(Map(entity), "Tavan kaydı eklendi.", 201);
    }

    public async Task<ApiResponse<SeveranceCeilingDto>> AdminUpdateAsync(int id, UpdateSeveranceCeilingDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Amount <= 0 || dto.EffectiveFrom == default || dto.EffectiveFrom.Year < 2000)
            return ApiResponse<SeveranceCeilingDto>.Fail("Geçerli bir tavan tutarı ve tarih gerekli.", 400, errorCode: ErrorCodes.SeveranceCeilingInvalid);

        var entity = await context.SeveranceCeilings.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
            return ApiResponse<SeveranceCeilingDto>.Fail("Tavan kaydı bulunamadı.", 404, errorCode: ErrorCodes.SeveranceCeilingNotFound);

        var effectiveFrom = dto.EffectiveFrom.Date;
        // Tarih değiştiriliyorsa başka kayıtla çakışmasın (unique index'i 500 yerine 409 ile karşıla).
        var clash = await context.SeveranceCeilings.AnyAsync(x => x.EffectiveFrom == effectiveFrom && x.Id != id, cancellationToken);
        if (clash)
            return ApiResponse<SeveranceCeilingDto>.Fail("Bu yürürlük tarihi için bir tavan zaten var.", 409, errorCode: ErrorCodes.SeveranceCeilingDateExists);

        entity.EffectiveFrom = effectiveFrom;
        entity.Amount = dto.Amount;
        entity.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();

        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<SeveranceCeilingDto>.Success(Map(entity), "Tavan kaydı güncellendi.");
    }

    public async Task<ApiResponse<string>> AdminDeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await context.SeveranceCeilings.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
            return ApiResponse<string>.Fail("Tavan kaydı bulunamadı.", 404, errorCode: ErrorCodes.SeveranceCeilingNotFound);

        context.SeveranceCeilings.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Tavan kaydı silindi.");
    }

    public async Task SeedDefaultsAsync(CancellationToken cancellationToken = default)
    {
        var existingDates = await context.SeveranceCeilings
            .Select(x => x.EffectiveFrom)
            .ToListAsync(cancellationToken);

        var missing = SeedDefaults
            .Where(s => !existingDates.Contains(s.EffectiveFrom))
            .Select(s => new SeveranceCeiling
            {
                EffectiveFrom = s.EffectiveFrom,
                Amount = s.Amount,
                Note = s.Note,
            })
            .ToList();

        if (missing.Count == 0) return;

        await context.SeveranceCeilings.AddRangeAsync(missing, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static SeveranceCeilingDto Map(SeveranceCeiling x) => new()
    {
        Id = x.Id,
        EffectiveFrom = x.EffectiveFrom,
        Amount = x.Amount,
        Note = x.Note,
    };
}
