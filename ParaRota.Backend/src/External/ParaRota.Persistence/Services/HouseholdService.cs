using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class HouseholdService(
    AppDbContext context,
    IMapper mapper,
    IMailService mailService,
    INotificationDispatcher dispatcher,
    IConfiguration configuration,
    ILogger<HouseholdService> logger) : IHouseholdService
{
    private string WebBaseUrl => configuration["App:WebBaseUrl"] ?? "http://localhost:5173";

    // ------------------------ Queries ------------------------

    public async Task<ApiResponse<IReadOnlyList<HouseholdDto>>> GetMineAsync(int userId, CancellationToken cancellationToken = default)
    {
        // Çift taraflı premium kuralı: premium olmayan kullanıcı aile listesi
        // göremez. 403 yerine boş liste — sahadaki eski istemciler (header'daki
        // scope menüsü her kullanıcı için bu ucu çağırır) hataya düşmeden
        // kişisel scope'ta kalır.
        if (!await HouseholdScope.IsPremiumAsync(context, userId, cancellationToken))
            return ApiResponse<IReadOnlyList<HouseholdDto>>.Success(Array.Empty<HouseholdDto>());

        return await BuildMembershipListAsync(userId, cancellationToken);
    }

    public Task<ApiResponse<IReadOnlyList<HouseholdDto>>> GetMyMembershipsAsync(int userId, CancellationToken cancellationToken = default)
        // Üyelik gerçeği premium'dan bağımsızdır: premium'u biten üye en azından
        // hangi ailelere üye olduğunu görüp AYRILABİLMELİDİR (Leave ucu da premium'suz).
        // Aile VERİSİ bu uçtan sızmaz — yalnız ad/rol/üye sayısı döner.
        => BuildMembershipListAsync(userId, cancellationToken);

    private async Task<ApiResponse<IReadOnlyList<HouseholdDto>>> BuildMembershipListAsync(int userId, CancellationToken cancellationToken)
    {
        // Kullanıcının Active member olduğu tüm household'lar.
        var memberships = await context.HouseholdMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Status == HouseholdMemberStatus.Active)
            .Select(m => new { m.HouseholdId, m.Role })
            .ToListAsync(cancellationToken);

        if (memberships.Count == 0)
            return ApiResponse<IReadOnlyList<HouseholdDto>>.Success(Array.Empty<HouseholdDto>());

        var ids = memberships.Select(m => m.HouseholdId).ToList();

        var households = await context.Households
            .AsNoTracking()
            .Include(h => h.Owner)
            .Where(h => ids.Contains(h.Id))
            .ToListAsync(cancellationToken);

        // Her household için Active member sayısı.
        var counts = await context.HouseholdMembers
            .AsNoTracking()
            .Where(m => ids.Contains(m.HouseholdId) && m.Status == HouseholdMemberStatus.Active)
            .GroupBy(m => m.HouseholdId)
            .Select(g => new { HouseholdId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var roleByHousehold = memberships.ToDictionary(m => m.HouseholdId, m => m.Role);
        var countByHousehold = counts.ToDictionary(c => c.HouseholdId, c => c.Count);

        var dtos = households.Select(h =>
        {
            var dto = mapper.Map<HouseholdDto>(h);
            dto.OwnerName = h.Owner is null ? string.Empty : $"{h.Owner.FirstName} {h.Owner.LastName}".Trim();
            dto.MemberCount = countByHousehold.TryGetValue(h.Id, out var c) ? c : 0;
            dto.MyRole = roleByHousehold.TryGetValue(h.Id, out var r) ? r : (HouseholdMemberRole?)null;
            return dto;
        })
        .OrderByDescending(d => d.CreatedDate)
        .ToList();

        return ApiResponse<IReadOnlyList<HouseholdDto>>.Success(dtos);
    }

    public async Task<ApiResponse<HouseholdDto>> GetByIdAsync(int userId, int householdId, CancellationToken cancellationToken = default)
    {
        var membership = await context.HouseholdMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (membership is null)
            return ApiResponse<HouseholdDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

        var household = await context.Households
            .AsNoTracking()
            .Include(h => h.Owner)
            .FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
            return ApiResponse<HouseholdDto>.Fail("Aile bulunamadı.", 404, errorCode: ErrorCodes.HouseholdNotFound);

        var memberCount = await context.HouseholdMembers
            .AsNoTracking()
            .CountAsync(m => m.HouseholdId == householdId && m.Status == HouseholdMemberStatus.Active, cancellationToken);

        var dto = mapper.Map<HouseholdDto>(household);
        dto.OwnerName = household.Owner is null ? string.Empty : $"{household.Owner.FirstName} {household.Owner.LastName}".Trim();
        dto.MemberCount = memberCount;
        dto.MyRole = membership.Role;

        return ApiResponse<HouseholdDto>.Success(dto);
    }

    public async Task<ApiResponse<IReadOnlyList<HouseholdMemberDto>>> GetMembersAsync(int userId, int householdId, CancellationToken cancellationToken = default)
    {
        var canAccess = await context.HouseholdMembers
            .AsNoTracking()
            .AnyAsync(m => m.HouseholdId == householdId
                        && m.UserId == userId
                        && m.Status == HouseholdMemberStatus.Active,
                      cancellationToken);
        if (!canAccess)
            return ApiResponse<IReadOnlyList<HouseholdMemberDto>>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

        var members = await context.HouseholdMembers
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.HouseholdId == householdId
                     && m.Status == HouseholdMemberStatus.Active)
            .OrderByDescending(m => m.Role)
            .ThenBy(m => m.JoinedAt)
            .ToListAsync(cancellationToken);

        var dtos = members.Select(mapper.Map<HouseholdMemberDto>).ToList();
        return ApiResponse<IReadOnlyList<HouseholdMemberDto>>.Success(dtos);
    }

    public async Task<ApiResponse<IReadOnlyList<HouseholdInviteDto>>> GetPendingInvitesAsync(int userId, int householdId, CancellationToken cancellationToken = default)
    {
        var membership = await context.HouseholdMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (membership is null || (membership.Role != HouseholdMemberRole.Owner && membership.Role != HouseholdMemberRole.Admin))
            return ApiResponse<IReadOnlyList<HouseholdInviteDto>>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

        var now = DateTime.Now;
        var invites = await context.HouseholdInvites
            .AsNoTracking()
            .Where(i => i.HouseholdId == householdId
                     && i.Status == InviteStatus.Pending
                     && i.ExpiresAt > now)
            .OrderByDescending(i => i.CreatedDate)
            .ToListAsync(cancellationToken);

        if (invites.Count == 0)
            return ApiResponse<IReadOnlyList<HouseholdInviteDto>>.Success(Array.Empty<HouseholdInviteDto>());

        var inviterIds = invites.Select(i => i.InvitedByUserId).Distinct().ToList();
        var inviters = await context.Users
            .AsNoTracking()
            .Where(u => inviterIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .ToListAsync(cancellationToken);
        var inviterByUserId = inviters.ToDictionary(x => x.Id, x => $"{x.FirstName} {x.LastName}".Trim());

        var dtos = invites.Select(i =>
        {
            var dto = mapper.Map<HouseholdInviteDto>(i);
            dto.InvitedByName = inviterByUserId.TryGetValue(i.InvitedByUserId, out var n) ? n : string.Empty;
            return dto;
        }).ToList();

        return ApiResponse<IReadOnlyList<HouseholdInviteDto>>.Success(dtos);
    }

    // ------------------------ Commands ------------------------

    public async Task<ApiResponse<HouseholdDto>> CreateAsync(int userId, CreateHouseholdDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        var currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency.Trim().ToUpperInvariant();

        var household = new Household
        {
            Name = name,
            OwnerUserId = userId,
            Currency = currency,
        };

        // Household + Owner + TransferMode (6 ExecuteUpdateAsync) tek transaction'da. TransferMode
        // ortasında exception kalırsa household yarı dolu yaratılmış kalmasın diye atomic.
        await using var dbTx = await context.Database.BeginTransactionAsync(cancellationToken);

        await context.Households.AddAsync(household, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        var owner = new HouseholdMember
        {
            HouseholdId = household.Id,
            UserId = userId,
            Role = HouseholdMemberRole.Owner,
            Status = HouseholdMemberStatus.Active,
            JoinedAt = DateTime.Now,
        };
        await context.HouseholdMembers.AddAsync(owner, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        if (dto.TransferMode == HouseholdTransferMode.Move)
        {
            // MOVE: Kullanıcının HouseholdId=NULL olan kayıtları yeni household'a TAŞIR.
            // Kişisel hesap boşalır. System kategorileri (UserId=NULL) hariç.
            await context.Transactions
                .Where(x => x.UserId == userId && x.HouseholdId == null)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)household.Id), cancellationToken);

            await context.Budgets
                .Where(x => x.UserId == userId && x.HouseholdId == null)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)household.Id), cancellationToken);

            await context.Categories
                .Where(x => x.UserId == userId && x.HouseholdId == null && !x.IsSystem)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)household.Id), cancellationToken);

            await context.Goals
                .Where(x => x.UserId == userId && x.HouseholdId == null)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)household.Id), cancellationToken);

            await context.RecurringRules
                .Where(x => x.UserId == userId && x.HouseholdId == null)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)household.Id), cancellationToken);

            await context.Debts
                .Where(x => x.UserId == userId && x.HouseholdId == null)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)household.Id), cancellationToken);
        }
        // None: mevcut veriler dokunulmaz (kişisel kalır).

        await dbTx.CommitAsync(cancellationToken);

        var result = await GetByIdAsync(userId, household.Id, cancellationToken);
        if (!result.IsSuccess) return result;
        return ApiResponse<HouseholdDto>.Success(result.Data!, "Aile oluşturuldu.", 201);
    }

    public async Task<ApiResponse<HouseholdDto>> UpdateAsync(int userId, int householdId, UpdateHouseholdDto dto, CancellationToken cancellationToken = default)
    {
        var membership = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (membership is null)
            return ApiResponse<HouseholdDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

        if (membership.Role != HouseholdMemberRole.Owner && membership.Role != HouseholdMemberRole.Admin)
            return ApiResponse<HouseholdDto>.Fail("Yalnızca Owner veya Admin aileyi düzenleyebilir.", 403, errorCode: ErrorCodes.HouseholdOnlyOwnerAdminEdit);

        var household = await context.Households.FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
            return ApiResponse<HouseholdDto>.Fail("Aile bulunamadı.", 404, errorCode: ErrorCodes.HouseholdNotFound);

        household.Name = dto.Name.Trim();
        await context.SaveChangesAsync(cancellationToken);

        var result = await GetByIdAsync(userId, householdId, cancellationToken);
        if (!result.IsSuccess) return result;
        return ApiResponse<HouseholdDto>.Success(result.Data!, "Aile güncellendi.");
    }

    public async Task<ApiResponse<HouseholdInviteDto>> InviteAsync(int userId, int householdId, InviteToHouseholdDto dto, CancellationToken cancellationToken = default)
    {
        var membership = await context.HouseholdMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (membership is null || (membership.Role != HouseholdMemberRole.Owner && membership.Role != HouseholdMemberRole.Admin))
            return ApiResponse<HouseholdInviteDto>.Fail("Davet göndermek için yetkiniz yok.", 403, errorCode: ErrorCodes.InviteSendForbidden);

        var email = dto.Email.Trim().ToLowerInvariant();

        // Email zaten aktif üye mi?
        var alreadyActive = await context.HouseholdMembers
            .AsNoTracking()
            .Include(m => m.User)
            .AnyAsync(m => m.HouseholdId == householdId
                        && m.Status == HouseholdMemberStatus.Active
                        && m.User != null
                        && m.User.Email != null
                        && m.User.Email.ToLower() == email,
                      cancellationToken);
        if (alreadyActive)
            return ApiResponse<HouseholdInviteDto>.Fail("Bu e-posta zaten ailenin aktif üyesi.", 409, errorCode: ErrorCodes.InviteEmailAlreadyMember);

        // Pending davet zaten var mı?
        var hasPending = await context.HouseholdInvites
            .AsNoTracking()
            .AnyAsync(i => i.HouseholdId == householdId
                        && i.Status == InviteStatus.Pending
                        && i.Email.ToLower() == email,
                      cancellationToken);
        if (hasPending)
            return ApiResponse<HouseholdInviteDto>.Fail("Bu e-posta için bekleyen bir davet zaten var.", 409, errorCode: ErrorCodes.InviteAlreadyPending);

        var household = await context.Households.AsNoTracking().FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
            return ApiResponse<HouseholdInviteDto>.Fail("Aile bulunamadı.", 404, errorCode: ErrorCodes.HouseholdNotFound);

        var token = Guid.NewGuid().ToString("N").Substring(0, 32);

        var invite = new HouseholdInvite
        {
            HouseholdId = householdId,
            Email = email,
            Token = token,
            ExpiresAt = DateTime.Now.AddDays(7),
            Status = InviteStatus.Pending,
            InvitedByUserId = userId,
        };
        await context.HouseholdInvites.AddAsync(invite, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        var inviterName = (await context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty).Trim();

        // Email gönder. Hata olursa hata yutma — error döndür.
        // appUrl: custom scheme — uygulama yüklüyse accept-invite ekranını token dolu açar.
        var acceptUrl = $"{WebBaseUrl.TrimEnd('/')}/accept-invite?token={token}";
        var appUrl = $"pararota://accept-invite?token={token}";
        var subject = $"ParaRota: \"{household.Name}\" ailesine davet edildiniz";
        var htmlBody = EmailTemplates.HouseholdInvite(household.Name, acceptUrl, appUrl, token, expiryDays: 7);

        try
        {
            await mailService.SendAsync(email, subject, htmlBody, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Aile davet e-postası gönderilemedi.");
            return ApiResponse<HouseholdInviteDto>.Fail("E-posta gönderilemedi.", 500, errorCode: ErrorCodes.EmailSendFailed);
        }

        // Davet edilen e-posta kayıtlı bir kullanıcıya aitse uygulama içi bildirim de
        // düşür (SignalR + push + DB) — e-postayı görmese bile uygulamadan kabul eder.
        await NotifyInvitedUserAsync(email, inviterName, household.Name, token, invite.Id,
            dedupKey: $"household-invite:{invite.Id}", cancellationToken);

        var resultDto = mapper.Map<HouseholdInviteDto>(invite);
        resultDto.InvitedByName = inviterName;

        return ApiResponse<HouseholdInviteDto>.Success(resultDto, "Davet gönderildi.", 201);
    }

    public async Task<ApiResponse<AcceptInviteResultDto>> AcceptInviteAsync(int userId, AcceptInviteDto dto, CancellationToken cancellationToken = default)
    {
        var token = dto.Token.Trim();
        var now = DateTime.Now;

        var invite = await context.HouseholdInvites
            .Include(i => i.Household)
            .FirstOrDefaultAsync(i => i.Token == token, cancellationToken);

        if (invite is null || invite.Status != InviteStatus.Pending || invite.ExpiresAt <= now)
            return ApiResponse<AcceptInviteResultDto>.Fail("Geçersiz veya süresi geçmiş davet.", 400, errorCode: ErrorCodes.InviteInvalidOrExpired);

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
            return ApiResponse<AcceptInviteResultDto>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        var userEmail = (user.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (!string.Equals(userEmail, invite.Email, StringComparison.OrdinalIgnoreCase))
            return ApiResponse<AcceptInviteResultDto>.Fail("Bu davet başka kullanıcıya gönderilmiş.", 403, errorCode: ErrorCodes.InviteWrongUser);

        var householdName = invite.Household?.Name ?? string.Empty;
        var resultDto = new AcceptInviteResultDto
        {
            HouseholdId = invite.HouseholdId,
            HouseholdName = householdName,
        };

        // Zaten üye ise sadece invite'ı Accepted'a çek.
        var existing = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == invite.HouseholdId && m.UserId == userId, cancellationToken);

        if (existing is not null)
        {
            if (existing.Status == HouseholdMemberStatus.Removed)
            {
                existing.Status = HouseholdMemberStatus.Active;
                existing.JoinedAt = now;
            }
            invite.Status = InviteStatus.Accepted;
            await context.SaveChangesAsync(cancellationToken);
            return ApiResponse<AcceptInviteResultDto>.Success(resultDto, "Zaten üyesin.");
        }

        var member = new HouseholdMember
        {
            HouseholdId = invite.HouseholdId,
            UserId = userId,
            Role = HouseholdMemberRole.Member,
            Status = HouseholdMemberStatus.Active,
            JoinedAt = now,
            InvitedByUserId = invite.InvitedByUserId,
        };
        await context.HouseholdMembers.AddAsync(member, cancellationToken);

        invite.Status = InviteStatus.Accepted;
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
            // Concurrent accept race — başka bir thread aynı (HouseholdId, UserId) ile
            // member kaydı eklemiş. Idempotent: zaten üye olmuş sayılır, davete Accepted bas.
            context.ChangeTracker.Clear();
            await context.HouseholdInvites
                .Where(i => i.Id == invite.Id && i.Status == InviteStatus.Pending)
                .ExecuteUpdateAsync(b => b.SetProperty(i => i.Status, InviteStatus.Accepted), cancellationToken);
            return ApiResponse<AcceptInviteResultDto>.Success(resultDto, "Zaten üyesin.");
        }

        // Owner'a bildirim.
        try
        {
            var household = invite.Household;
            var memberName = $"{user.FirstName} {user.LastName}".Trim();
            var payload = JsonSerializer.Serialize(new
            {
                memberName,
                householdName = household?.Name ?? string.Empty,
                householdId = invite.HouseholdId,
            });

            var envelope = new NotificationEnvelope(
                UserId: household?.OwnerUserId ?? invite.InvitedByUserId,
                Type: NotificationType.System,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_household_memberJoined_title",
                MessageKey: "notif_household_memberJoined_body",
                Payload: payload,
                RefType: "household",
                RefId: invite.HouseholdId,
                DedupKey: $"household:{invite.HouseholdId}:joined:{userId}",
                PushTitle: "Yeni üye",
                PushBody: $"{memberName} aileye katıldı.");

            await dispatcher.DispatchAsync(envelope, cancellationToken);
        }
        catch (Exception ex)
        {
            // Bildirim hatası akışı durdurmaz.
            logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort).");
        }

        return ApiResponse<AcceptInviteResultDto>.Success(resultDto, "Davet kabul edildi.");
    }

    public async Task<ApiResponse<string>> CancelInviteAsync(int userId, int householdId, int inviteId, CancellationToken cancellationToken = default)
    {
        var membership = await context.HouseholdMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (membership is null || (membership.Role != HouseholdMemberRole.Owner && membership.Role != HouseholdMemberRole.Admin))
            return ApiResponse<string>.Fail("Daveti iptal etmek için yetkiniz yok.", 403, errorCode: ErrorCodes.InviteCancelForbidden);

        var invite = await context.HouseholdInvites
            .FirstOrDefaultAsync(i => i.Id == inviteId && i.HouseholdId == householdId, cancellationToken);
        if (invite is null)
            return ApiResponse<string>.Fail("Davet bulunamadı.", 404, errorCode: ErrorCodes.InviteNotFound);

        if (invite.Status != InviteStatus.Pending)
            return ApiResponse<string>.Fail("Bu davet artık iptal edilemez.", 400, errorCode: ErrorCodes.InviteNotCancellable);

        invite.Status = InviteStatus.Cancelled;
        await context.SaveChangesAsync(cancellationToken);

        // Davet edilen kayıtlı kullanıcıya bildirim — kayıtlı değilse sessizce geç.
        try
        {
            var invitee = await context.Users
                .AsNoTracking()
                .Where(u => u.Email != null && u.Email.ToLower() == invite.Email)
                .Select(u => new { u.Id })
                .FirstOrDefaultAsync(cancellationToken);
            if (invitee is not null)
            {
                var household = await context.Households.AsNoTracking()
                    .FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
                var payload = JsonSerializer.Serialize(new { householdName = household?.Name ?? string.Empty });
                var envelope = new NotificationEnvelope(
                    UserId: invitee.Id,
                    Type: NotificationType.System,
                    Severity: NotificationSeverity.Info,
                    TitleKey: "notif_household_inviteCancelled_title",
                    MessageKey: "notif_household_inviteCancelled_body",
                    Payload: payload,
                    RefType: "household",
                    RefId: householdId,
                    DedupKey: $"household:{householdId}:inviteCancelled:{invite.Id}",
                    PushTitle: "Davet iptal edildi",
                    PushBody: $"{household?.Name ?? "Aile"} daveti iptal edildi.");
                await dispatcher.DispatchAsync(envelope, cancellationToken);
            }
        }
        catch { /* notification hatası akışı durdurmaz */ }

        return ApiResponse<string>.Success("", "Davet iptal edildi.");
    }

    public async Task<ApiResponse<HouseholdInviteDto>> ResendInviteAsync(int userId, int householdId, int inviteId, CancellationToken cancellationToken = default)
    {
        var isOwnerOrAdmin = await HouseholdScope.IsOwnerOrAdminAsync(context, userId, householdId, cancellationToken);
        if (!isOwnerOrAdmin)
            return ApiResponse<HouseholdInviteDto>.Fail("Daveti yeniden göndermek için yetkiniz yok.", 403, errorCode: ErrorCodes.InviteResendForbidden);

        var invite = await context.HouseholdInvites
            .FirstOrDefaultAsync(i => i.Id == inviteId && i.HouseholdId == householdId, cancellationToken);
        if (invite is null)
            return ApiResponse<HouseholdInviteDto>.Fail("Davet bulunamadı.", 404, errorCode: ErrorCodes.InviteNotFound);

        if (invite.Status != InviteStatus.Pending)
            return ApiResponse<HouseholdInviteDto>.Fail("Bu davet yeniden gönderilemez.", 409, errorCode: ErrorCodes.InviteNotResendable);

        var household = await context.Households.AsNoTracking().FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
            return ApiResponse<HouseholdInviteDto>.Fail("Aile bulunamadı.", 404, errorCode: ErrorCodes.HouseholdNotFound);

        invite.ExpiresAt = DateTime.Now.AddDays(7);
        await context.SaveChangesAsync(cancellationToken);

        // Mail compose — InviteAsync ile aynı pattern.
        var acceptUrl = $"{WebBaseUrl.TrimEnd('/')}/accept-invite?token={invite.Token}";
        var appUrl = $"pararota://accept-invite?token={invite.Token}";
        var subject = $"ParaRota: \"{household.Name}\" ailesine davet edildiniz";
        var htmlBody = EmailTemplates.HouseholdInvite(household.Name, acceptUrl, appUrl, invite.Token, expiryDays: 7);

        try
        {
            await mailService.SendAsync(invite.Email, subject, htmlBody, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Aile davet e-postası gönderilemedi.");
            return ApiResponse<HouseholdInviteDto>.Fail("E-posta gönderilemedi.", 500, errorCode: ErrorCodes.EmailSendFailed);
        }

        var inviterName = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == invite.InvitedByUserId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        // Yeniden gönderim bilinçli bir tekrar bildirimidir → dedup anahtarı zaman damgalı.
        await NotifyInvitedUserAsync(invite.Email, inviterName.Trim(), household.Name, invite.Token, invite.Id,
            dedupKey: $"household-invite:{invite.Id}:resend:{DateTime.Now.Ticks}", cancellationToken);

        var resultDto = mapper.Map<HouseholdInviteDto>(invite);
        resultDto.InvitedByName = inviterName.Trim();

        return ApiResponse<HouseholdInviteDto>.Success(resultDto, "Davet yeniden gönderildi.");
    }

    /// <summary>
    /// Davet edilen e-posta kayıtlı bir kullanıcıya aitse uygulama içi bildirim düşürür.
    /// Payload'daki token, mobilde bildirime dokununca accept-invite ekranını dolu açar.
    /// Bildirim hatası davet akışını durdurmaz.
    /// </summary>
    private async Task NotifyInvitedUserAsync(
        string email,
        string inviterName,
        string householdName,
        string token,
        int inviteId,
        string dedupKey,
        CancellationToken cancellationToken)
    {
        try
        {
            var invitedUserId = await context.Users
                .AsNoTracking()
                .Where(u => u.Email != null && u.Email.ToLower() == email)
                .Select(u => (int?)u.Id)
                .FirstOrDefaultAsync(cancellationToken);
            if (invitedUserId is not int targetUserId)
                return;

            var payload = JsonSerializer.Serialize(new { inviterName, householdName, token });

            var envelope = new NotificationEnvelope(
                UserId: targetUserId,
                Type: NotificationType.System,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_household_invited_title",
                MessageKey: "notif_household_invited_body",
                Payload: payload,
                RefType: "household-invite",
                RefId: inviteId,
                DedupKey: dedupKey,
                PushTitle: "Aile daveti",
                PushBody: $"{inviterName} seni \"{householdName}\" ailesine davet etti.");

            await dispatcher.DispatchAsync(envelope, cancellationToken);
        }
        catch (Exception ex)
        {
            // Bildirim hatası akışı durdurmaz.
            logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort).");
        }
    }

    public async Task<ApiResponse<string>> RemoveMemberAsync(int userId, int householdId, int memberUserId, CancellationToken cancellationToken = default)
    {
        if (userId == memberUserId)
            return ApiResponse<string>.Fail("Kendinizi çıkaramazsınız. Lütfen 'Aileden ayrıl' işlemini kullanın.", 400, errorCode: ErrorCodes.MemberCannotRemoveSelf);

        var caller = await context.HouseholdMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (caller is null || (caller.Role != HouseholdMemberRole.Owner && caller.Role != HouseholdMemberRole.Admin))
            return ApiResponse<string>.Fail("Üye çıkarmak için yetkiniz yok.", 403, errorCode: ErrorCodes.MemberRemoveForbidden);

        var target = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == memberUserId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (target is null)
            return ApiResponse<string>.Fail("Üye bulunamadı.", 404, errorCode: ErrorCodes.MemberNotFound);

        if (target.Role == HouseholdMemberRole.Owner)
            return ApiResponse<string>.Fail("Owner çıkarılamaz. Önce ownership transferi yapın.", 400, errorCode: ErrorCodes.OwnerCannotBeRemoved);

        // Status flag, audit trail kalır.
        target.Status = HouseholdMemberStatus.Removed;

        // Üyelik kapanışı + 6 tablo re-scope tek transaction'da — ExecuteUpdateAsync'ler
        // tek tek commit olduğundan yarıda kesilirse defter kalıcı tutarsız kalıyordu.
        await using (var dbTx = await context.Database.BeginTransactionAsync(cancellationToken))
        {
            // Kullanıcının household'a bağlı kayıtlarını kişisel yap (HouseholdId=NULL).
            await MoveMemberRecordsToPersonalAsync(householdId, memberUserId, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            await dbTx.CommitAsync(cancellationToken);
        }

        // Kick'lenen kullanıcıya bildirim.
        try
        {
            var household = await context.Households.AsNoTracking().FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
            var payload = JsonSerializer.Serialize(new
            {
                householdName = household?.Name ?? string.Empty,
                householdId,
            });
            var envelope = new NotificationEnvelope(
                UserId: memberUserId,
                Type: NotificationType.System,
                Severity: NotificationSeverity.Warning,
                TitleKey: "notif_household_memberRemoved_title",
                MessageKey: "notif_household_memberRemoved_body",
                Payload: payload,
                RefType: "household",
                RefId: householdId,
                DedupKey: $"household:{householdId}:removed:{memberUserId}",
                PushTitle: "Aileden çıkarıldın",
                PushBody: $"{household?.Name ?? "Aile"} ailesinden çıkarıldın.");
            await dispatcher.DispatchAsync(envelope, cancellationToken);
        }
        catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

        return ApiResponse<string>.Success("", "Üye aileden çıkarıldı.");
    }

    /// <summary>
    /// Üyenin kendi oluşturduğu household kayıtlarını kişisel deftere döndürür (HouseholdId=NULL).
    /// Hem RemoveMemberAsync (çıkarılma) hem member self-leave (ayrılma) bu semantiği paylaşır;
    /// üyenin kendi verisi ailede kilitli kalmaz.
    /// </summary>
    private async Task MoveMemberRecordsToPersonalAsync(int householdId, int memberUserId, CancellationToken cancellationToken)
    {
        await context.Transactions
            .Where(x => x.HouseholdId == householdId && x.UserId == memberUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
        await context.Budgets
            .Where(x => x.HouseholdId == householdId && x.UserId == memberUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
        await context.Categories
            .Where(x => x.HouseholdId == householdId && x.UserId == memberUserId && !x.IsSystem)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
        await context.Goals
            .Where(x => x.HouseholdId == householdId && x.UserId == memberUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
        await context.RecurringRules
            .Where(x => x.HouseholdId == householdId && x.UserId == memberUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
        await context.Debts
            .Where(x => x.HouseholdId == householdId && x.UserId == memberUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
    }

    public async Task<ApiResponse<string>> LeaveAsync(int userId, int householdId, LeaveHouseholdDto dto, CancellationToken cancellationToken = default)
    {
        var membership = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (membership is null)
            return ApiResponse<string>.Fail("Bu ailenin üyesi değilsiniz.", 403, errorCode: ErrorCodes.NotHouseholdMember);

        var household = await context.Households
            .FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
            return ApiResponse<string>.Fail("Aile bulunamadı.", 404, errorCode: ErrorCodes.HouseholdNotFound);

        var now = DateTime.Now;

        switch (dto.Mode)
        {
            case LeaveHouseholdMode.Transfer:
            {
                if (membership.Role != HouseholdMemberRole.Owner)
                    return ApiResponse<string>.Fail("Sadece Owner ownership transferi ile ayrılabilir.", 403, errorCode: ErrorCodes.OwnerMustTransferToLeave);
                if (dto.TargetUserId is null || dto.TargetUserId <= 0)
                    return ApiResponse<string>.Fail("Hedef üye belirtilmeli.", 400, errorCode: ErrorCodes.TargetMemberRequired);

                var target = await context.HouseholdMembers
                    .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                           && m.UserId == dto.TargetUserId.Value
                                           && m.Status == HouseholdMemberStatus.Active,
                                         cancellationToken);
                if (target is null)
                    return ApiResponse<string>.Fail("Hedef üye bulunamadı veya aktif değil.", 404, errorCode: ErrorCodes.TargetMemberNotFound);

                household.OwnerUserId = target.UserId;
                target.Role = HouseholdMemberRole.Owner;
                // Eski owner ayrılıyor.
                membership.Role = HouseholdMemberRole.Member;
                membership.Status = HouseholdMemberStatus.Removed;

                await context.SaveChangesAsync(cancellationToken);

                try
                {
                    var payload = JsonSerializer.Serialize(new { householdName = household.Name, householdId });
                    var envelope = new NotificationEnvelope(
                        UserId: target.UserId,
                        Type: NotificationType.System,
                        Severity: NotificationSeverity.Info,
                        TitleKey: "notif_household_ownershipTransferred_title",
                        MessageKey: "notif_household_ownershipTransferred_body",
                        Payload: payload,
                        RefType: "household",
                        RefId: householdId,
                        DedupKey: $"household:{householdId}:owner:{target.UserId}",
                        PushTitle: "Aile sahipliği sana devredildi",
                        PushBody: $"Artık {household.Name} ailesinin owner'ısın.");
                    await dispatcher.DispatchAsync(envelope, cancellationToken);
                }
                catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

                return ApiResponse<string>.Success("", "Sahiplik devredildi ve aileden ayrıldın.");
            }

            case LeaveHouseholdMode.Personal:
            {
                // Owner olmayan üye için Personal = SELF-LEAVE: yalnız kendi üyeliği kapanır,
                // kendi katkıları kişisel deftere döner (RemoveMemberAsync semantiğiyle aynı).
                // Tüm istemciler member için 'personal' gönderir — premium'u biten üyenin
                // ayrılma yolu budur, premium gerektirmez. Owner için Personal = aileyi fesh.
                if (membership.Role != HouseholdMemberRole.Owner)
                {
                    membership.Status = HouseholdMemberStatus.Removed;
                    // Üyelik kapanışı + re-scope tek transaction'da (RemoveMemberAsync ile aynı gerekçe).
                    await using (var dbTx = await context.Database.BeginTransactionAsync(cancellationToken))
                    {
                        await MoveMemberRecordsToPersonalAsync(householdId, userId, cancellationToken);
                        await context.SaveChangesAsync(cancellationToken);
                        await dbTx.CommitAsync(cancellationToken);
                    }

                    try
                    {
                        var memberName = await context.Users.AsNoTracking()
                            .Where(u => u.Id == userId)
                            .Select(u => (u.FirstName + " " + u.LastName).Trim())
                            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;
                        var payload = JsonSerializer.Serialize(new { memberName, householdName = household.Name, householdId });
                        var envelope = new NotificationEnvelope(
                            UserId: household.OwnerUserId,
                            Type: NotificationType.System,
                            Severity: NotificationSeverity.Info,
                            TitleKey: "notif_household_memberLeft_title",
                            MessageKey: "notif_household_memberLeft_body",
                            Payload: payload,
                            RefType: "household",
                            RefId: householdId,
                            DedupKey: $"household:{householdId}:left:{userId}:{now:yyyyMMdd}",
                            PushTitle: "Bir üye aileden ayrıldı",
                            PushBody: $"{memberName} {household.Name} ailesinden ayrıldı.");
                        await dispatcher.DispatchAsync(envelope, cancellationToken);
                    }
                    catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

                    return ApiResponse<string>.Success("", "Aileden ayrıldın. Katkıların kişisel defterine taşındı.");
                }

                // Tüm üyelere bildirim için listeyi şimdi al.
                var memberUserIds = await context.HouseholdMembers
                    .AsNoTracking()
                    .Where(m => m.HouseholdId == householdId && m.Status == HouseholdMemberStatus.Active)
                    .Select(m => m.UserId)
                    .ToListAsync(cancellationToken);

                // Tüm household kayıtlarını personal (HouseholdId=NULL) yap + soft delete —
                // 6 ExecuteUpdateAsync tek tek commit olduğundan tek transaction şart.
                await using (var dbTx = await context.Database.BeginTransactionAsync(cancellationToken))
                {
                    await context.Transactions
                        .Where(x => x.HouseholdId == householdId)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
                    await context.Budgets
                        .Where(x => x.HouseholdId == householdId)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
                    await context.Categories
                        .Where(x => x.HouseholdId == householdId && !x.IsSystem)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
                    await context.Goals
                        .Where(x => x.HouseholdId == householdId)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
                    await context.RecurringRules
                        .Where(x => x.HouseholdId == householdId)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);
                    await context.Debts
                        .Where(x => x.HouseholdId == householdId)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.HouseholdId, (int?)null), cancellationToken);

                    // Household soft delete.
                    context.Households.Remove(household);
                    await context.SaveChangesAsync(cancellationToken);
                    await dbTx.CommitAsync(cancellationToken);
                }

                try
                {
                    foreach (var mid in memberUserIds)
                    {
                        if (mid == userId) continue;
                        var payload = JsonSerializer.Serialize(new { householdName = household.Name, householdId });
                        var envelope = new NotificationEnvelope(
                            UserId: mid,
                            Type: NotificationType.System,
                            Severity: NotificationSeverity.Warning,
                            TitleKey: "notif_household_dissolved_title",
                            MessageKey: "notif_household_dissolved_body",
                            Payload: payload,
                            RefType: "household",
                            RefId: householdId,
                            DedupKey: $"household:{householdId}:dissolved:{mid}",
                            PushTitle: "Aile feshedildi",
                            PushBody: $"{household.Name} ailesi feshedildi. Verilerin kişisel olarak kaldı.");
                        await dispatcher.DispatchAsync(envelope, cancellationToken);
                    }
                }
                catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

                return ApiResponse<string>.Success("", "Aile feshedildi. Veriler kişisel kaldı.");
            }

            case LeaveHouseholdMode.Delete:
            {
                if (membership.Role != HouseholdMemberRole.Owner)
                    return ApiResponse<string>.Fail("Bu işlemi yalnızca Owner yapabilir.", 403, errorCode: ErrorCodes.OnlyOwnerAction);

                var memberUserIds = await context.HouseholdMembers
                    .AsNoTracking()
                    .Where(m => m.HouseholdId == householdId && m.Status == HouseholdMemberStatus.Active)
                    .Select(m => m.UserId)
                    .ToListAsync(cancellationToken);

                // Tüm household-bağlı kayıtları soft delete.
                var transactions = await context.Transactions
                    .Where(x => x.HouseholdId == householdId).ToListAsync(cancellationToken);
                if (transactions.Count > 0) context.Transactions.RemoveRange(transactions);

                var budgets = await context.Budgets
                    .Where(x => x.HouseholdId == householdId).ToListAsync(cancellationToken);
                if (budgets.Count > 0) context.Budgets.RemoveRange(budgets);

                var categories = await context.Categories
                    .Where(x => x.HouseholdId == householdId && !x.IsSystem).ToListAsync(cancellationToken);
                if (categories.Count > 0) context.Categories.RemoveRange(categories);

                var goals = await context.Goals
                    .Where(x => x.HouseholdId == householdId).ToListAsync(cancellationToken);
                if (goals.Count > 0) context.Goals.RemoveRange(goals);

                var rules = await context.RecurringRules
                    .Where(x => x.HouseholdId == householdId).ToListAsync(cancellationToken);
                if (rules.Count > 0) context.RecurringRules.RemoveRange(rules);

                var debts = await context.Debts
                    .Where(x => x.HouseholdId == householdId).ToListAsync(cancellationToken);
                if (debts.Count > 0) context.Debts.RemoveRange(debts);

                context.Households.Remove(household);
                await context.SaveChangesAsync(cancellationToken);

                try
                {
                    foreach (var mid in memberUserIds)
                    {
                        if (mid == userId) continue;
                        var payload = JsonSerializer.Serialize(new { householdName = household.Name, householdId });
                        var envelope = new NotificationEnvelope(
                            UserId: mid,
                            Type: NotificationType.System,
                            Severity: NotificationSeverity.Error,
                            TitleKey: "notif_household_deleted_title",
                            MessageKey: "notif_household_deleted_body",
                            Payload: payload,
                            RefType: "household",
                            RefId: householdId,
                            DedupKey: $"household:{householdId}:deleted:{mid}",
                            PushTitle: "Aile silindi",
                            PushBody: $"{household.Name} ailesi silindi. Tüm ortak veriler silindi.");
                        await dispatcher.DispatchAsync(envelope, cancellationToken);
                    }
                }
                catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

                return ApiResponse<string>.Success("", "Aile ve tüm ortak verileri silindi.");
            }

            default:
                return ApiResponse<string>.Fail("Geçersiz çıkış modu.", 400, errorCode: ErrorCodes.InvalidLeaveMode);
        }
    }

    public async Task<ApiResponse<string>> TransferOwnershipAsync(int userId, int householdId, int newOwnerUserId, CancellationToken cancellationToken = default)
    {
        if (userId == newOwnerUserId)
            return ApiResponse<string>.Fail("Kendinize sahiplik devredemezsiniz.", 400, errorCode: ErrorCodes.CannotTransferToSelf);

        var caller = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == userId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (caller is null || caller.Role != HouseholdMemberRole.Owner)
            return ApiResponse<string>.Fail("Yalnızca Owner sahiplik devredebilir.", 403, errorCode: ErrorCodes.OnlyOwnerTransfers);

        var target = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == newOwnerUserId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (target is null)
            return ApiResponse<string>.Fail("Hedef üye bulunamadı veya aktif değil.", 404, errorCode: ErrorCodes.TargetMemberNotFound);

        var household = await context.Households.FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
            return ApiResponse<string>.Fail("Aile bulunamadı.", 404, errorCode: ErrorCodes.HouseholdNotFound);

        household.OwnerUserId = newOwnerUserId;
        target.Role = HouseholdMemberRole.Owner;
        caller.Role = HouseholdMemberRole.Member;

        await context.SaveChangesAsync(cancellationToken);

        try
        {
            var payload = JsonSerializer.Serialize(new { householdName = household.Name, householdId });
            // Yeni owner'a
            var newOwnerEnvelope = new NotificationEnvelope(
                UserId: newOwnerUserId,
                Type: NotificationType.System,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_household_ownershipTransferred_title",
                MessageKey: "notif_household_ownershipTransferred_body",
                Payload: payload,
                RefType: "household",
                RefId: householdId,
                DedupKey: $"household:{householdId}:owner:{newOwnerUserId}",
                PushTitle: "Aile sahipliği sana devredildi",
                PushBody: $"Artık {household.Name} ailesinin owner'ısın.");
            await dispatcher.DispatchAsync(newOwnerEnvelope, cancellationToken);

            // Eski owner'a — artık Member rolüne düştü, bilgisi olmalı
            var demotedEnvelope = new NotificationEnvelope(
                UserId: userId,
                Type: NotificationType.System,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_household_ownershipHandedOver_title",
                MessageKey: "notif_household_ownershipHandedOver_body",
                Payload: payload,
                RefType: "household",
                RefId: householdId,
                DedupKey: $"household:{householdId}:handedOver:{userId}:{newOwnerUserId}",
                PushTitle: "Aile sahipliği devredildi",
                PushBody: $"{household.Name} ailesinin sahipliğini başka bir üyeye devrettin.");
            await dispatcher.DispatchAsync(demotedEnvelope, cancellationToken);
        }
        catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

        return ApiResponse<string>.Success("", "Sahiplik devredildi.");
    }

    public async Task<ApiResponse<string>> UpdateMemberRoleAsync(int userId, int householdId, int memberUserId, HouseholdMemberRole newRole, CancellationToken cancellationToken = default)
    {
        var isOwnerOrAdmin = await HouseholdScope.IsOwnerOrAdminAsync(context, userId, householdId, cancellationToken);
        if (!isOwnerOrAdmin)
            return ApiResponse<string>.Fail("Üye rolünü değiştirmek için yetkiniz yok.", 403, errorCode: ErrorCodes.MemberRoleChangeForbidden);

        if (newRole != HouseholdMemberRole.Admin && newRole != HouseholdMemberRole.Member)
            return ApiResponse<string>.Fail("Bu endpoint ile yalnızca Admin veya Member rolü atanabilir.", 400, errorCode: ErrorCodes.RoleAssignInvalid);

        var target = await context.HouseholdMembers
            .FirstOrDefaultAsync(m => m.HouseholdId == householdId
                                   && m.UserId == memberUserId
                                   && m.Status == HouseholdMemberStatus.Active,
                                 cancellationToken);
        if (target is null)
            return ApiResponse<string>.Fail("Üye bulunamadı.", 404, errorCode: ErrorCodes.MemberNotFound);

        if (target.Role == HouseholdMemberRole.Owner)
            return ApiResponse<string>.Fail("Owner rolü bu endpoint'le değiştirilemez.", 400, errorCode: ErrorCodes.OwnerRoleImmutable);

        if (target.Role == newRole)
            return ApiResponse<string>.Success("", "Rol zaten güncel.");

        target.Role = newRole;
        await context.SaveChangesAsync(cancellationToken);

        try
        {
            var household = await context.Households.AsNoTracking().FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
            var payload = JsonSerializer.Serialize(new
            {
                role = newRole.ToString(),
                householdName = household?.Name ?? string.Empty,
                householdId,
            });

            var envelope = new NotificationEnvelope(
                UserId: memberUserId,
                Type: NotificationType.System,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_household_roleChanged_title",
                MessageKey: "notif_household_roleChanged_body",
                Payload: payload,
                RefType: "household",
                RefId: householdId,
                DedupKey: $"household:{householdId}:role:{memberUserId}:{newRole}",
                PushTitle: "Rolün güncellendi",
                PushBody: $"{household?.Name ?? "Aile"} ailesindeki rolün artık {newRole}.");
            await dispatcher.DispatchAsync(envelope, cancellationToken);
        }
        catch (Exception ex) { logger.LogWarning(ex, "Aile bildirimi gönderilemedi (best-effort)."); }

        return ApiResponse<string>.Success("", "Üye rolü güncellendi.");
    }

    // ------------------------ Maintenance ------------------------

    public async Task<int> ExpireOldInvitesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        logger.LogInformation("Household invite expiration job başladı.");
        // ExecuteUpdateAsync atomic bulk update — change tracker'a ihtiyaç yok.
        var affected = await context.HouseholdInvites
            .Where(i => i.Status == InviteStatus.Pending && i.ExpiresAt <= now)
            .ExecuteUpdateAsync(b => b.SetProperty(i => i.Status, InviteStatus.Expired), cancellationToken);
        logger.LogInformation("Household invite expiration job: {Count} davet süresi doldu olarak işaretlendi.", affected);
        return affected;
    }
}
