using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.GoldDays;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Gün / Altın günü modülü. Üyeler + otomatik toplantı takvimi (her üye sırayla ev sahibi),
/// "kim ödedi" takibi, kasanın bugünkü TL değeri (altın → truncgil fiyat) ve toplantı hatırlatma.
/// Kişisel scope (v1); entity aile (Household) için hazır. Yalnız oluşturan düzenler.
/// </summary>
public class GoldDayService(
    AppDbContext context,
    ICurrentUserService currentUser,
    ITruncgilGoldClient goldClient,
    INotificationDispatcher dispatcher,
    ILogger<GoldDayService> logger) : IGoldDayService
{
    private const int ReminderHorizonDays = 3;
    private static readonly string[] GoldUnits = ["gram", "ceyrek", "yarim", "tam", "cumhuriyet"];
    // Altın fiyatı süreç-içi cache (her yazımda truncgil HTTP'sini tekrarlamamak için).
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<AssetType, (DateTime At, decimal Sell)> PriceCache = new();
    private static readonly TimeSpan PriceTtl = TimeSpan.FromMinutes(10);

    public async Task<ApiResponse<IReadOnlyList<GoldDayListItemDto>>> GetMyAsync(int userId, GoldDayStatus? status, CancellationToken ct = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);
        var baseQuery = scope.HasValue
            ? context.GoldDays.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.GoldDays.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        if (status.HasValue) baseQuery = baseQuery.Where(x => x.Status == status.Value);

        var days = await baseQuery
            .Include(x => x.Members)
            .Include(x => x.Meetings)
            .OrderBy(x => x.Status)
            .ThenByDescending(x => x.Id)
            .Take(200)
            .ToListAsync(ct);

        var list = days.Select(gd =>
        {
            var n = gd.Members.Count;
            var next = gd.Meetings.Where(m => !m.IsCompleted).OrderBy(m => m.SequenceNo).FirstOrDefault();
            var hostName = next is null ? null : gd.Members.FirstOrDefault(m => m.Id == next.HostMemberId)?.Name;
            decimal? potTry = gd.ContributionType == GoldDayType.Currency && gd.ContributionUnit == "TRY"
                ? Math.Max(n - 1, 0) * gd.ContributionAmount
                : null; // altın TL değeri yalnız detayda (fiyat çağrısı)
            return new GoldDayListItemDto
            {
                Id = gd.Id,
                Name = gd.Name,
                ContributionType = gd.ContributionType,
                ContributionUnit = gd.ContributionUnit,
                ContributionAmount = gd.ContributionAmount,
                Status = gd.Status,
                MemberCount = n,
                NextMeetingDate = next?.MeetingDate,
                NextHostName = hostName,
                CompletedMeetings = gd.Meetings.Count(m => m.IsCompleted),
                PotValueTry = potTry,
            };
        }).ToList();

        return ApiResponse<IReadOnlyList<GoldDayListItemDto>>.Success(list);
    }

    public async Task<ApiResponse<GoldDayDetailDto>> GetByIdAsync(int userId, int id, CancellationToken ct = default)
    {
        var gd = await LoadAsync(userId, id, ct);
        if (gd is null) return NotFound();
        return ApiResponse<GoldDayDetailDto>.Success(await MapDetailAsync(gd, ct));
    }

    public async Task<ApiResponse<GoldDayDetailDto>> CreateAsync(int userId, CreateGoldDayDto dto, CancellationToken ct = default)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
            return Invalid("Gün adı gerekli.");
        if (dto.ContributionAmount <= 0)
            return Invalid("Katkı tutarı sıfırdan büyük olmalı.");

        var unit = NormalizeUnit(dto.ContributionType, dto.ContributionUnit);
        if (unit is null)
            return Invalid("Geçersiz katkı birimi.");

        var members = (dto.Members ?? [])
            .Select(m => (Name: m.Name?.Trim() ?? string.Empty, m.IsSelf))
            .Where(m => !string.IsNullOrWhiteSpace(m.Name))
            .ToList();
        if (members.Count < 2)
            return ApiResponse<GoldDayDetailDto>.Fail("En az 2 üye gerekli.", 400, errorCode: ErrorCodes.GoldDayMinMembers);
        if (members.Count > 50)
            return Invalid("En fazla 50 üye eklenebilir.");

        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);

        await using var tx = await context.Database.BeginTransactionAsync(ct);

        var entity = new GoldDay
        {
            UserId = userId,
            HouseholdId = scope,
            Name = name,
            ContributionType = dto.ContributionType,
            ContributionUnit = unit,
            ContributionAmount = dto.ContributionAmount,
            Frequency = dto.Frequency,
            StartDate = dto.StartDate == default ? DateTime.Now.Date : dto.StartDate.Date,
            Status = GoldDayStatus.Active,
        };
        // Önce üyeler — toplantı/katkılar onların Id'lerine bağlanır. "Ben" tekil olmalı.
        var selfUsed = false;
        for (var i = 0; i < members.Count; i++)
        {
            var isSelf = members[i].IsSelf && !selfUsed;
            if (isSelf) selfUsed = true;
            entity.Members.Add(new GoldDayMember { Name = members[i].Name, Order = i, IsSelf = isSelf });
        }

        await context.GoldDays.AddAsync(entity, ct);
        await context.SaveChangesAsync(ct);

        var ordered = entity.Members.OrderBy(m => m.Order).ToList();
        for (var i = 0; i < ordered.Count; i++)
        {
            var meeting = new GoldDayMeeting
            {
                GoldDayId = entity.Id,
                SequenceNo = i + 1,
                MeetingDate = AddFrequency(entity.StartDate, entity.Frequency, i),
                HostMemberId = ordered[i].Id,
                IsCompleted = false,
            };
            // Ev sahibi hariç herkes katkı verir.
            foreach (var m in ordered.Where(m => m.Id != ordered[i].Id))
                meeting.Contributions.Add(new GoldDayContribution { MemberId = m.Id, IsPaid = false });
            entity.Meetings.Add(meeting);
        }
        await context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var created = await LoadAsync(userId, entity.Id, ct);
        return ApiResponse<GoldDayDetailDto>.Success(await MapDetailAsync(created!, ct), "Gün oluşturuldu.", 201);
    }

    public async Task<ApiResponse<GoldDayDetailDto>> UpdateAsync(int userId, int id, UpdateGoldDayDto dto, CancellationToken ct = default)
    {
        var gd = await LoadAsync(userId, id, ct);
        if (gd is null) return NotFound();
        if (gd.UserId != userId) return Forbidden();

        // Yalnız yeniden adlandırma — durum, toplantı tamamlanışından türetilir (SetMeetingCompleted).
        var name = dto.Name?.Trim();
        if (!string.IsNullOrWhiteSpace(name)) gd.Name = name;
        await context.SaveChangesAsync(ct);
        return ApiResponse<GoldDayDetailDto>.Success(await MapDetailAsync(gd, ct), "Gün güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken ct = default)
    {
        var gd = await LoadAsync(userId, id, ct);
        if (gd is null) return ApiResponse<string>.Fail("Gün bulunamadı.", 404, errorCode: ErrorCodes.GoldDayNotFound);
        if (gd.UserId != userId) return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        // Soft-delete cascade — EF cascade soft-silmez, çocukları elle kaldır.
        foreach (var meeting in gd.Meetings)
        {
            context.GoldDayContributions.RemoveRange(meeting.Contributions);
            context.GoldDayMeetings.Remove(meeting);
        }
        context.GoldDayMembers.RemoveRange(gd.Members);
        context.GoldDays.Remove(gd);
        await context.SaveChangesAsync(ct);
        return ApiResponse<string>.Success("Gün silindi.");
    }

    public async Task<ApiResponse<GoldDayDetailDto>> SetContributionPaidAsync(int userId, int contributionId, bool isPaid, CancellationToken ct = default)
    {
        var contribution = await context.GoldDayContributions
            .Include(c => c.Meeting).ThenInclude(m => m.GoldDay)
            .FirstOrDefaultAsync(c => c.Id == contributionId, ct);
        if (contribution is null)
            return ApiResponse<GoldDayDetailDto>.Fail("Katkı bulunamadı.", 404, errorCode: ErrorCodes.GoldDayContributionNotFound);

        var gd = contribution.Meeting.GoldDay;
        var scope = await ResolveScopeAsync(userId, ct);
        if (!OwnsScope(gd, userId, scope)) return NotFound();
        if (gd.UserId != userId) return Forbidden();

        contribution.IsPaid = isPaid;
        contribution.PaidDate = isPaid ? DateTime.Now : null;
        await context.SaveChangesAsync(ct);

        var reloaded = await LoadAsync(userId, gd.Id, ct);
        return ApiResponse<GoldDayDetailDto>.Success(await MapDetailAsync(reloaded!, ct));
    }

    public async Task<ApiResponse<GoldDayDetailDto>> SetMeetingCompletedAsync(int userId, int meetingId, bool isCompleted, CancellationToken ct = default)
    {
        var meeting = await context.GoldDayMeetings
            .Include(m => m.GoldDay).ThenInclude(g => g.Meetings)
            .FirstOrDefaultAsync(m => m.Id == meetingId, ct);
        if (meeting is null)
            return ApiResponse<GoldDayDetailDto>.Fail("Toplantı bulunamadı.", 404, errorCode: ErrorCodes.GoldDayMeetingNotFound);

        var gd = meeting.GoldDay;
        var scope = await ResolveScopeAsync(userId, ct);
        if (!OwnsScope(gd, userId, scope)) return NotFound();
        if (gd.UserId != userId) return Forbidden();

        meeting.IsCompleted = isCompleted;
        // Tüm toplantılar tamamlandıysa tur bitti.
        gd.Status = gd.Meetings.All(m => m.IsCompleted) ? GoldDayStatus.Completed : GoldDayStatus.Active;
        await context.SaveChangesAsync(ct);

        var reloaded = await LoadAsync(userId, gd.Id, ct);
        return ApiResponse<GoldDayDetailDto>.Success(await MapDetailAsync(reloaded!, ct));
    }

    public async Task<int> SendMeetingRemindersAsync(CancellationToken ct = default)
    {
        var now = DateTime.Now;
        var today = now.Date;
        var horizon = today.AddDays(ReminderHorizonDays);
        logger.LogInformation("GoldDay reminder job başladı (horizon: {Days} gün).", ReminderHorizonDays);

        var meetings = await context.GoldDayMeetings
            .Include(m => m.GoldDay)
            .Include(m => m.HostMember)
            .Where(m => !m.IsCompleted
                     && m.MeetingDate >= today && m.MeetingDate <= horizon
                     && (m.LastReminderSentDate == null || m.LastReminderSentDate < today)
                     && m.GoldDay.Status == GoldDayStatus.Active)
            .ToListAsync(ct);

        if (meetings.Count == 0)
        {
            logger.LogInformation("GoldDay reminder job: hatırlatma gerekli toplantı yok.");
            return 0;
        }

        var sent = 0;
        foreach (var meeting in meetings)
        {
            var gd = meeting.GoldDay;
            var daysUntil = Math.Max(0, (int)Math.Floor((meeting.MeetingDate.Date - today).TotalDays));
            var payload = JsonSerializer.Serialize(new
            {
                goldDayId = gd.Id,
                name = gd.Name,
                hostName = meeting.HostMember.Name,
                meetingDate = meeting.MeetingDate,
                daysUntil,
            });
            var envelope = new NotificationEnvelope(
                UserId: gd.UserId, // kişisel scope; v2 aile → tüm üyeler
                Type: NotificationType.GoldDayMeetingSoon,
                Severity: NotificationSeverity.Warning,
                TitleKey: "notif_goldday_meetingSoon_title",
                MessageKey: "notif_goldday_meetingSoon_body",
                Payload: payload,
                RefType: "goldday",
                RefId: gd.Id,
                DedupKey: $"goldday:{meeting.Id}:soon:{meeting.MeetingDate:yyyy-MM-dd}",
                PushTitle: "Gün yaklaşıyor",
                PushBody: $"{gd.Name}: ev sahibi {meeting.HostMember.Name}");
            try
            {
                await dispatcher.DispatchAsync(envelope, ct);
                meeting.LastReminderSentDate = today;
                sent++;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "GoldDay {Id} toplantısı için hatırlatma gönderilemedi.", meeting.Id);
            }
        }

        await context.SaveChangesAsync(ct);
        logger.LogInformation("GoldDay reminder job tamamlandı: {Sent} bildirim.", sent);
        return sent;
    }

    // ── Yardımcılar ────────────────────────────────────────────────────────
    // Aktif scope'u DAİMA HouseholdScope ile çöz — üyelik + premium doğrulaması (ham
    // ActiveHouseholdId kullanmak IDOR/premium-bypass açar). Üye/premium değilse null (kişisel).
    private Task<int?> ResolveScopeAsync(int userId, CancellationToken ct) =>
        HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);

    private async Task<GoldDay?> LoadAsync(int userId, int id, CancellationToken ct)
    {
        var scope = await ResolveScopeAsync(userId, ct);
        return await ScopeFilteredQuery(userId, scope)
            .Include(x => x.Members)
            .Include(x => x.Meetings).ThenInclude(m => m.Contributions)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    private IQueryable<GoldDay> ScopeFilteredQuery(int userId, int? scope) =>
        scope.HasValue
            ? context.GoldDays.Where(x => x.HouseholdId == scope.Value)
            : context.GoldDays.Where(x => x.HouseholdId == null && x.UserId == userId);

    private static bool OwnsScope(GoldDay gd, int userId, int? scope) =>
        scope.HasValue ? gd.HouseholdId == scope.Value : gd.HouseholdId == null && gd.UserId == userId;

    private async Task<GoldDayDetailDto> MapDetailAsync(GoldDay gd, CancellationToken ct)
    {
        var members = gd.Members.OrderBy(m => m.Order).ToList();
        var nameById = members.ToDictionary(m => m.Id, m => m.Name);
        var n = members.Count;
        var potUnits = Math.Max(n - 1, 0) * gd.ContributionAmount;
        var (unitPrice, potTry) = await ComputePotAsync(gd, potUnits, ct);

        return new GoldDayDetailDto
        {
            Id = gd.Id,
            Name = gd.Name,
            ContributionType = gd.ContributionType,
            ContributionUnit = gd.ContributionUnit,
            ContributionAmount = gd.ContributionAmount,
            Frequency = gd.Frequency,
            StartDate = gd.StartDate,
            Status = gd.Status,
            PotUnits = potUnits,
            UnitPriceTry = unitPrice,
            PotValueTry = potTry,
            CurrentMeetingId = gd.Meetings.Where(m => !m.IsCompleted).OrderBy(m => m.SequenceNo).FirstOrDefault()?.Id,
            Members = members.Select(m => new GoldDayMemberDto { Id = m.Id, Name = m.Name, Order = m.Order, IsSelf = m.IsSelf }).ToList(),
            Meetings = gd.Meetings.OrderBy(m => m.SequenceNo).Select(m => new GoldDayMeetingDto
            {
                Id = m.Id,
                SequenceNo = m.SequenceNo,
                MeetingDate = m.MeetingDate,
                HostMemberId = m.HostMemberId,
                HostName = nameById.GetValueOrDefault(m.HostMemberId, string.Empty),
                IsCompleted = m.IsCompleted,
                PaidCount = m.Contributions.Count(c => c.IsPaid),
                ContributionCount = m.Contributions.Count,
                Contributions = m.Contributions.OrderBy(c => c.MemberId).Select(c => new GoldDayContributionDto
                {
                    Id = c.Id,
                    MemberId = c.MemberId,
                    MemberName = nameById.GetValueOrDefault(c.MemberId, string.Empty),
                    IsPaid = c.IsPaid,
                    PaidDate = c.PaidDate,
                }).ToList(),
            }).ToList(),
        };
    }

    private async Task<(decimal? unitPrice, decimal? potTry)> ComputePotAsync(GoldDay gd, decimal potUnits, CancellationToken ct)
    {
        if (gd.ContributionType == GoldDayType.Gold)
        {
            var asset = GoldUnitToAsset(gd.ContributionUnit);
            if (asset is null) return (null, null);
            if (PriceCache.TryGetValue(asset.Value, out var hit) && DateTime.Now - hit.At < PriceTtl)
                return (hit.Sell, Math.Round(potUnits * hit.Sell, 2));
            try
            {
                var price = await goldClient.GetGoldAsync(asset.Value, ct);
                if (price is null) return (null, null);
                PriceCache[asset.Value] = (DateTime.Now, price.Value.sell);
                return (price.Value.sell, Math.Round(potUnits * price.Value.sell, 2));
            }
            catch
            {
                return (null, null); // fiyat alınamazsa best-effort
            }
        }
        if (gd.ContributionUnit == "TRY")
            return (1m, potUnits);
        return (null, null); // diğer döviz → v1'de TL çevirisi yok
    }

    private static string? NormalizeUnit(GoldDayType type, string? unit)
    {
        var u = unit?.Trim().ToLowerInvariant() ?? string.Empty;
        if (type == GoldDayType.Gold)
            return GoldUnits.Contains(u) ? u : null;
        // Para: 3 harf döviz kodu
        var c = unit?.Trim().ToUpperInvariant() ?? string.Empty;
        return c.Length == 3 ? c : null;
    }

    private static AssetType? GoldUnitToAsset(string unit) => unit switch
    {
        "gram" => AssetType.GoldGram,
        "ceyrek" => AssetType.GoldQuarter,
        "yarim" => AssetType.GoldHalf,
        "tam" => AssetType.GoldFull,
        "cumhuriyet" => AssetType.GoldRepublic,
        _ => null,
    };

    private static DateTime AddFrequency(DateTime start, GoldDayFrequency freq, int times) => freq switch
    {
        GoldDayFrequency.Weekly => start.AddDays(7 * times),
        GoldDayFrequency.Biweekly => start.AddDays(14 * times),
        _ => start.AddMonths(times),
    };

    private static ApiResponse<GoldDayDetailDto> NotFound() =>
        ApiResponse<GoldDayDetailDto>.Fail("Gün bulunamadı.", 404, errorCode: ErrorCodes.GoldDayNotFound);
    private static ApiResponse<GoldDayDetailDto> Forbidden() =>
        ApiResponse<GoldDayDetailDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);
    private static ApiResponse<GoldDayDetailDto> Invalid(string msg) =>
        ApiResponse<GoldDayDetailDto>.Fail(msg, 400, errorCode: ErrorCodes.GoldDayInvalidInput);
}
