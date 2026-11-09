namespace ParaRota.Application.Services;

/// <summary>Bir aya ait TÜFE endeks değeri (ayın ilk günü normalize edilmiş).</summary>
public sealed record CpiPoint(DateTime Month, decimal Index);

/// <summary>
/// TÜFE (Tüketici Fiyat Endeksi, EVDS <c>TP.FG.J0</c>, 2003=100) aylık endeks serisinin
/// TEK kaynağı. Seriyi EVDS'ten bir kez çekip süreç-içi önbellekte tutar; kira artışı ve
/// enflasyon hesaplayıcı gibi tüm tüketiciler buradan okur (EVDS seri kodu + cache tek yerde).
/// TÜİK yayını aylarca gecikebildiği için "istenen ay" ile "eldeki en güncel ay" ayrışabilir.
/// </summary>
public interface ICpiIndexService
{
    /// <summary>
    /// [start, end] aralığındaki aylık endeks noktaları, kronolojik sırada.
    /// Ağ/parse hatasında veya veri yoksa boş liste döner.
    /// </summary>
    Task<IReadOnlyList<CpiPoint>> GetSeriesAsync(DateTime start, DateTime end, CancellationToken ct = default);

    /// <summary>
    /// Verilen ayın endeksi; o ay henüz yayınlanmadıysa eldeki en güncel ≤ <paramref name="month"/>
    /// noktayı döner (provisional kullanımı çağırana bırakılır). Hiç veri yoksa / EVDS'e
    /// erişilemiyorsa <c>null</c>.
    /// </summary>
    Task<CpiPoint?> GetClosestNotAfterAsync(DateTime month, CancellationToken ct = default);
}
