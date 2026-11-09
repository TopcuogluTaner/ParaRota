using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.PriceAlarms;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Fiyat alarmı modülü. Bir varlığın güncel TL fiyatı eşiği aşınca bildirim gönderir.
/// Kontrol Hangfire ile periyodik; tetiklenen alarm tek-seferlik (Triggered → "yeniden kur"
/// ile Active). Kişisel scope (v1), entity aileye hazır. Yalnız oluşturan düzenler.
/// </summary>
public class PriceAlarmService(
    AppDbContext context,
    ICurrentUserService currentUser,
    IMarketDataService market,
    INotificationDispatcher dispatcher,
    ILogger<PriceAlarmService> logger) : IPriceAlarmService
{
    public async Task<ApiResponse<IReadOnlyList<PriceAlarmDto>>> GetMyAsync(int userId, AlarmStatus? status, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, ct);
        var query = ScopeQuery(userId, scope).AsNoTracking();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);

        var alarms = await query.OrderByDescending(x => x.Id).Take(200).ToListAsync(ct);

        // Güncel fiyatı (varlık, fon kodu) başına bir kez çöz (snapshot — hızlı). Best-effort:
        // bir sağlayıcı patlarsa liste yine render olsun, o varlık CurrentPrice=null kalsın.
        var prices = new Dictionary<(AssetType, string?), decimal?>();
        foreach (var key in alarms.Select(x => (x.AssetType, x.FundCode)).Distinct())
        {
            try { prices[key] = await market.GetSpotPriceAsync(key.AssetType, key.FundCode, ct); }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "PriceAlarm liste: {Asset}/{Fund} güncel fiyatı alınamadı.", key.AssetType, key.FundCode);
                prices[key] = null;
            }
        }

        var list = alarms.Select(x => Map(x, prices.GetValueOrDefault((x.AssetType, x.FundCode)))).ToList();
        return ApiResponse<IReadOnlyList<PriceAlarmDto>>.Success(list);
    }

    public async Task<ApiResponse<PriceAlarmDto>> CreateAsync(int userId, CreatePriceAlarmDto dto, CancellationToken ct = default)
    {
        if (!Enum.IsDefined(dto.AssetType) || !Enum.IsDefined(dto.Direction))
            return Invalid("Geçersiz varlık veya yön.");
        if (dto.ThresholdPrice <= 0)
            return Invalid("Eşik fiyat sıfırdan büyük olmalı.");
        if (dto.Note?.Trim().Length > 200)
            return Invalid("Not en fazla 200 karakter olabilir.");

        // TEFAS fonu ise kodu doğrula + adını yakala.
        string? fundCode = null;
        string? fundName = null;
        decimal fundPrice = 0m;
        if (dto.AssetType.IsTefas())
        {
            if (string.IsNullOrWhiteSpace(dto.FundCode))
                return ApiResponse<PriceAlarmDto>.Fail("Fon kodu girilmeli.", 400, errorCode: ErrorCodes.FundCodeRequired);
            var quote = await market.LookupTefasFundAsync(dto.FundCode, ct);
            if (quote is null)
                return ApiResponse<PriceAlarmDto>.Fail("Geçersiz TEFAS fon kodu.", 400, errorCode: ErrorCodes.FundCodeInvalid);
            fundCode = quote.Code;
            fundName = quote.Name;
            fundPrice = quote.Price;
        }

        var scope = await ResolveScopeAsync(userId, ct);
        var entity = new PriceAlarm
        {
            UserId = userId,
            HouseholdId = scope,
            AssetType = dto.AssetType,
            FundCode = fundCode,
            FundName = fundName,
            Direction = dto.Direction,
            ThresholdPrice = dto.ThresholdPrice,
            Status = AlarmStatus.Active,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
        };
        await context.PriceAlarms.AddAsync(entity, ct);
        await context.SaveChangesAsync(ct);

        // TEFAS: fiyatı snapshot'a yaz → pano/alarm ertesi günkü job'u beklemeden görür.
        if (entity.AssetType.IsTefas() && fundCode is not null)
            await market.SaveTefasSnapshotAsync(fundCode, fundPrice, ct);

        var current = await market.GetSpotPriceAsync(entity.AssetType, entity.FundCode, ct);
        return ApiResponse<PriceAlarmDto>.Success(Map(entity, current), "Alarm kuruldu.", 201);
    }

    public async Task<ApiResponse<PriceAlarmDto>> UpdateAsync(int userId, int id, UpdatePriceAlarmDto dto, CancellationToken ct = default)
    {
        if (!Enum.IsDefined(dto.Direction)) return Invalid("Geçersiz yön.");
        if (dto.ThresholdPrice <= 0) return Invalid("Eşik fiyat sıfırdan büyük olmalı.");
        if (dto.Note?.Trim().Length > 200) return Invalid("Not en fazla 200 karakter olabilir.");

        var entity = await LoadAsync(userId, id, ct);
        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbidden();

        entity.Direction = dto.Direction;
        entity.ThresholdPrice = dto.ThresholdPrice;
        entity.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        // Düzenleme yeniden kurar — eşik değişince tekrar izlenmeli.
        entity.Status = AlarmStatus.Active;
        entity.TriggeredPrice = null;
        entity.TriggeredAt = null;
        await context.SaveChangesAsync(ct);

        var current = await market.GetSpotPriceAsync(entity.AssetType, entity.FundCode, ct);
        return ApiResponse<PriceAlarmDto>.Success(Map(entity, current), "Alarm güncellendi.");
    }

    public async Task<ApiResponse<PriceAlarmDto>> RearmAsync(int userId, int id, CancellationToken ct = default)
    {
        var entity = await LoadAsync(userId, id, ct);
        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbidden();

        entity.Status = AlarmStatus.Active;
        entity.TriggeredPrice = null;
        entity.TriggeredAt = null;
        await context.SaveChangesAsync(ct);

        var current = await market.GetSpotPriceAsync(entity.AssetType, entity.FundCode, ct);
        return ApiResponse<PriceAlarmDto>.Success(Map(entity, current), "Alarm yeniden kuruldu.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken ct = default)
    {
        var entity = await LoadAsync(userId, id, ct);
        if (entity is null) return ApiResponse<string>.Fail("Alarm bulunamadı.", 404, errorCode: ErrorCodes.PriceAlarmNotFound);
        if (entity.UserId != userId) return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        context.PriceAlarms.Remove(entity);
        await context.SaveChangesAsync(ct);
        return ApiResponse<string>.Success("Alarm silindi.");
    }

    public async Task<int> CheckAlarmsAsync(CancellationToken ct = default)
    {
        var active = await context.PriceAlarms.Where(x => x.Status == AlarmStatus.Active).ToListAsync(ct);
        if (active.Count == 0) return 0;
        logger.LogInformation("PriceAlarm kontrol başladı: {Count} aktif alarm.", active.Count);

        var now = DateTime.Now;
        // TEFAS fonları FundCode ile ayrışır → (varlık, fon kodu) bazında grupla; her grup
        // tek fiyat çağrısı yapsın.
        var byAsset = active.GroupBy(x => (x.AssetType, x.FundCode));
        var fired = 0;

        foreach (var group in byAsset)
        {
            decimal? price;
            try
            {
                // CoinGecko/TEFAS free-tier ardışık çağrıda 429 verebilir → küçük gecikme.
                if (group.Key.AssetType.IsCrypto() || group.Key.AssetType.IsTefas()) await Task.Delay(1500, ct);
                price = await market.GetLiveSpotPriceAsync(group.Key.AssetType, group.Key.FundCode, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "PriceAlarm: {Asset}/{Fund} fiyatı alınamadı.", group.Key.AssetType, group.Key.FundCode);
                continue;
            }
            if (price is null or <= 0m) continue;

            foreach (var alarm in group)
            {
                alarm.LastPrice = price;
                alarm.LastCheckedAt = now;

                var crossed = alarm.Direction == AlarmDirection.Above ? price >= alarm.ThresholdPrice : price <= alarm.ThresholdPrice;
                if (!crossed) continue;

                // DedupKey TriggeredAt'a bağlı olduğundan zarfı kurmadan önce tetik bilgilerini
                // yaz; ancak Status'u YALNIZ dispatch başarılı olunca Triggered'a çevir. Aksi
                // halde paylaşılan scoped DbContext'te bildirim SaveChanges'i erken flush ettiğinde,
                // gönderim patlasa bile alarm Triggered'a düşüp sessizce susardı (kullanıcı uyarıyı
                // kaçırır). Hata olursa tetik bilgilerini geri al → bir sonraki kontrolde tekrar denenir.
                alarm.TriggeredPrice = price;
                alarm.TriggeredAt = now;

                try
                {
                    await dispatcher.DispatchAsync(BuildEnvelope(alarm, price.Value), ct);
                    alarm.Status = AlarmStatus.Triggered;
                    fired++;
                }
                catch (Exception ex)
                {
                    alarm.TriggeredPrice = null;
                    alarm.TriggeredAt = null;
                    logger.LogWarning(ex, "PriceAlarm {Id} bildirimi gönderilemedi.", alarm.Id);
                }
            }
        }

        await context.SaveChangesAsync(ct);
        logger.LogInformation("PriceAlarm kontrol tamamlandı: {Fired} tetiklendi.", fired);
        return fired;
    }

    // ── Yardımcılar ────────────────────────────────────────────────────────
    private Task<int?> ResolveScopeAsync(int userId, CancellationToken ct) =>
        HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);

    private async Task<PriceAlarm?> LoadAsync(int userId, int id, CancellationToken ct)
    {
        var scope = await ResolveScopeAsync(userId, ct);
        return await ScopeQuery(userId, scope).FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    private IQueryable<PriceAlarm> ScopeQuery(int userId, int? scope) =>
        scope.HasValue
            ? context.PriceAlarms.Where(x => x.HouseholdId == scope.Value)
            : context.PriceAlarms.Where(x => x.HouseholdId == null && x.UserId == userId);

    private NotificationEnvelope BuildEnvelope(PriceAlarm alarm, decimal price)
    {
        var label = AssetLabel(alarm);
        var payload = JsonSerializer.Serialize(new
        {
            alarmId = alarm.Id,
            asset = label,
            assetType = alarm.AssetType.ToString(),
            direction = alarm.Direction.ToString(),
            threshold = alarm.ThresholdPrice,
            price,
        });
        return new NotificationEnvelope(
            UserId: alarm.UserId,
            Type: NotificationType.PriceAlarmTriggered,
            Severity: NotificationSeverity.Info,
            TitleKey: "notif_pricealarm_triggered_title",
            MessageKey: "notif_pricealarm_triggered_body",
            Payload: payload,
            RefType: "pricealarm",
            RefId: alarm.Id,
            DedupKey: $"pricealarm:{alarm.Id}:triggered:{alarm.TriggeredAt:yyyyMMddHHmm}",
            PushTitle: "Fiyat alarmı",
            PushBody: $"{label}: {price:N2} ₺");
    }

    private static PriceAlarmDto Map(PriceAlarm x, decimal? current) => new()
    {
        Id = x.Id,
        AssetType = x.AssetType,
        FundCode = x.FundCode,
        FundName = x.FundName,
        Direction = x.Direction,
        ThresholdPrice = x.ThresholdPrice,
        Status = x.Status,
        LastPrice = x.LastPrice,
        LastCheckedAt = x.LastCheckedAt,
        TriggeredPrice = x.TriggeredPrice,
        TriggeredAt = x.TriggeredAt,
        Note = x.Note,
        CurrentPrice = current,
        CreatedDate = x.CreatedDate,
    };

    private static string AssetLabel(PriceAlarm a)
    {
        if (a.AssetType.IsTefas())
            return a.FundName ?? a.FundCode ?? "TEFAS Fonu";
        return a.AssetType switch
        {
            AssetType.GoldGram => "Gram Altın",
            AssetType.GoldQuarter => "Çeyrek Altın",
            AssetType.GoldHalf => "Yarım Altın",
            AssetType.GoldFull => "Tam Altın",
            AssetType.GoldRepublic => "Cumhuriyet Altını",
            _ => a.AssetType.ToString().ToUpperInvariant(),
        };
    }

    private static ApiResponse<PriceAlarmDto> NotFound() =>
        ApiResponse<PriceAlarmDto>.Fail("Alarm bulunamadı.", 404, errorCode: ErrorCodes.PriceAlarmNotFound);
    private static ApiResponse<PriceAlarmDto> Forbidden() =>
        ApiResponse<PriceAlarmDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);
    private static ApiResponse<PriceAlarmDto> Invalid(string msg) =>
        ApiResponse<PriceAlarmDto>.Fail(msg, 400, errorCode: ErrorCodes.PriceAlarmInvalidInput);
}
