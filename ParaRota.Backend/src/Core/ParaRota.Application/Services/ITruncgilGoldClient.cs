using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

// Günlük (canlı) altın kaynağı — gram + çeyrek/yarım/tam/Cumhuriyet (truncgil).
// TCMB resmi altın aylık olduğu için güncel/günlük değer buradan. Impl: Infrastructure.
public interface ITruncgilGoldClient
{
    // Verilen altın türünün günlük (alış, satış) TL fiyatı. null = ulaşılamadı / tür değil.
    Task<(decimal buy, decimal sell)?> GetGoldAsync(AssetType asset, CancellationToken ct = default);
}
