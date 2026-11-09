using ParaRota.Application.DTOs.Payroll;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

/// <summary>
/// Kıdem tazminatı tavanı yönetimi. Tavan dönemsel (Ocak/Temmuz) değişir ve resmi bir
/// parametre API'si yoktur; bu yüzden admin panelinden DB'de yönetilir, hesap servisi
/// (TurkishPayrollService) tavanı buradan okur. Kod/deploy değişikliği gerekmez.
/// </summary>
public interface ISeveranceCeilingService
{
    /// <summary>Hesap için sade dönem listesi (EffectiveFrom artan). ComputeSeverance'a verilir.</summary>
    Task<IReadOnlyList<SeveranceCeilingPeriod>> GetPeriodsAsync(CancellationToken cancellationToken = default);

    /// <summary>Admin listesi — tüm dönemler (en yeni önce).</summary>
    Task<ApiResponse<IReadOnlyList<SeveranceCeilingDto>>> AdminListAsync(CancellationToken cancellationToken = default);

    Task<ApiResponse<SeveranceCeilingDto>> AdminCreateAsync(CreateSeveranceCeilingDto dto, CancellationToken cancellationToken = default);

    Task<ApiResponse<SeveranceCeilingDto>> AdminUpdateAsync(int id, UpdateSeveranceCeilingDto dto, CancellationToken cancellationToken = default);

    Task<ApiResponse<string>> AdminDeleteAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Startup seed — bilinen dönemler (2026 H1) EffectiveFrom bazlı idempotent eklenir.</summary>
    Task SeedDefaultsAsync(CancellationToken cancellationToken = default);
}
