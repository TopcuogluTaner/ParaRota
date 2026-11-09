using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.SharedPots;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Ortak Kasa — grup masrafı + "kim kime borçlu" netleştirmesi (Splitwise mantığı). Kişisel ya da
/// aile scope'ta; üyeler gerçek kullanıcı (bildirim alır) veya serbest isim. Kasa yapısını (ad/üye)
/// yalnız sahibi yönetir; masraf/ödemeyi her erişen ekler, kendi kaydını siler. Para birimi kasa başına tek.
/// </summary>
public class SharedPotService(
    AppDbContext context,
    ICurrentUserService currentUser,
    INotificationDispatcher dispatcher,
    ILogger<SharedPotService> logger) : ISharedPotService
{
    private const decimal Eps = 0.01m;
    private const decimal MaxAmount = 1_000_000_000m; // 1 milyar — kuruş→long cast taşmasını ve absürt girdiyi engeller

    // ── Liste ────────────────────────────────────────────────────────────────
    public async Task<ApiResponse<IReadOnlyList<SharedPotListItemDto>>> GetMyAsync(int userId, SharedPotStatus? status, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, ct);
        var query = ScopeQuery(userId, scope);
        if (status.HasValue) query = query.Where(p => p.Status == status.Value);

        var pots = await query
            .AsNoTracking()
            .Include(p => p.Members)
            .Include(p => p.Expenses)
            .Include(p => p.Settlements)
            .OrderByDescending(p => p.Id)
            .Take(200)
            .ToListAsync(ct);

        if (pots.Count == 0)
            return ApiResponse<IReadOnlyList<SharedPotListItemDto>>.Success([]);

        var potIds = pots.Select(p => p.Id).ToList();
        var shares = await context.SharedExpenseShares
            .AsNoTracking()
            .Where(s => potIds.Contains(s.SharedExpense.SharedPotId))
            .Select(s => new { PotId = s.SharedExpense.SharedPotId, s.MemberId, s.ShareAmount })
            .ToListAsync(ct);
        var sharesByPot = shares.GroupBy(s => s.PotId)
            .ToDictionary(g => g.Key, g => g.Select(x => (x.MemberId, x.ShareAmount)).ToList());

        var list = pots.Select(p =>
        {
            var balances = ComputeBalances(
                p.Members.Select(m => m.Id),
                p.Expenses.Select(e => (e.PayerMemberId, e.Amount)),
                sharesByPot.TryGetValue(p.Id, out var sh) ? sh : [],
                p.Settlements.Select(s => (s.FromMemberId, s.ToMemberId, s.Amount)));

            var myMember = p.Members.FirstOrDefault(m => m.LinkedUserId == userId);
            return new SharedPotListItemDto
            {
                Id = p.Id,
                Name = p.Name,
                Currency = p.Currency,
                Status = p.Status,
                MemberCount = p.Members.Count,
                ExpenseCount = p.Expenses.Count,
                TotalSpent = p.Expenses.Sum(e => e.Amount),
                MyBalance = myMember is null ? null : balances[myMember.Id].balance,
                CreatedDate = p.CreatedDate,
            };
        }).ToList();

        return ApiResponse<IReadOnlyList<SharedPotListItemDto>>.Success(list);
    }

    public async Task<ApiResponse<SharedPotDetailDto>> GetDetailAsync(int userId, int id, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, id, ct);
        if (pot is null) return NotFound();
        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, pot, ct));
    }

    // ── Kasa CRUD ────────────────────────────────────────────────────────────
    public async Task<ApiResponse<SharedPotDetailDto>> CreateAsync(int userId, CreateSharedPotDto dto, CancellationToken ct = default)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (name.Length is 0 or > 120) return Invalid("Kasa adı 1-120 karakter olmalı.");
        if (dto.Note?.Trim().Length > 300) return Invalid("Not en fazla 300 karakter olabilir.");

        var scope = await ResolveScopeAsync(userId, ct);
        var currency = NormalizeCurrency(dto.Currency);

        // Üye adaylarının (bağlı kullanıcı) geçerli aile üyesi olduğunu doğrula.
        var linkedIds = dto.Members.Where(m => m.LinkedUserId.HasValue).Select(m => m.LinkedUserId!.Value).ToHashSet();
        if (linkedIds.Count > 0)
        {
            if (!scope.HasValue) return Invalid("Bağlı üye yalnızca aile kasasında eklenebilir.");
            var validMembers = await HouseholdMemberIdsAsync(scope.Value, ct);
            if (!linkedIds.All(validMembers.Contains)) return Invalid("Seçilen üye bu ailede değil.");
        }

        var names = await ResolveUserNamesAsync(linkedIds.Append(userId), ct);
        var pot = new SharedPot
        {
            UserId = userId,
            HouseholdId = scope,
            Name = name,
            Currency = currency,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            Status = SharedPotStatus.Active,
        };

        // Sahip otomatik üye (kendisi).
        pot.Members.Add(new SharedPotMember { Name = names.GetValueOrDefault(userId, "Ben"), LinkedUserId = userId });

        var seenLinked = new HashSet<int> { userId };
        foreach (var m in dto.Members)
        {
            if (m.LinkedUserId.HasValue)
            {
                if (!seenLinked.Add(m.LinkedUserId.Value)) continue; // tekrar eden bağlı üye atlanır
                pot.Members.Add(new SharedPotMember { Name = names.GetValueOrDefault(m.LinkedUserId.Value, "Üye"), LinkedUserId = m.LinkedUserId.Value });
            }
            else
            {
                var mn = m.Name?.Trim();
                if (string.IsNullOrEmpty(mn)) continue;
                if (mn.Length > 80) mn = mn[..80];
                pot.Members.Add(new SharedPotMember { Name = mn, LinkedUserId = null });
            }
        }

        if (pot.Members.Count < 2) return Invalid("En az 2 üye gerekli (sen + 1).");

        await context.SharedPots.AddAsync(pot, ct);
        await context.SaveChangesAsync(ct);

        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, pot, ct), "Ortak kasa oluşturuldu.", 201);
    }

    public async Task<ApiResponse<SharedPotDetailDto>> UpdateAsync(int userId, int id, UpdateSharedPotDto dto, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, id, ct);
        if (pot is null) return NotFound();
        if (pot.UserId != userId) return Forbidden();

        var name = dto.Name?.Trim() ?? string.Empty;
        if (name.Length is 0 or > 120) return Invalid("Kasa adı 1-120 karakter olmalı.");
        if (dto.Note?.Trim().Length > 300) return Invalid("Not en fazla 300 karakter olabilir.");

        pot.Name = name;
        pot.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        await context.SaveChangesAsync(ct);

        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, pot, ct), "Kasa güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, id, ct);
        if (pot is null) return ApiResponse<string>.Fail("Kasa bulunamadı.", 404, errorCode: ErrorCodes.SharedPotNotFound);
        if (pot.UserId != userId) return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        // Çocukları soft-sil (global filter cascade tetiklemez). Tek SaveChanges = tek DB transaction.
        var expenseEntities = await context.SharedExpenses.Where(e => e.SharedPotId == id).ToListAsync(ct);
        if (expenseEntities.Count > 0)
        {
            var expenseIds = expenseEntities.Select(e => e.Id).ToList();
            var sharesToDel = await context.SharedExpenseShares.Where(s => expenseIds.Contains(s.SharedExpenseId)).ToListAsync(ct);
            context.SharedExpenseShares.RemoveRange(sharesToDel);
            context.SharedExpenses.RemoveRange(expenseEntities);
        }
        context.SharedSettlements.RemoveRange(await context.SharedSettlements.Where(s => s.SharedPotId == id).ToListAsync(ct));
        context.SharedPotMembers.RemoveRange(await context.SharedPotMembers.Where(m => m.SharedPotId == id).ToListAsync(ct));
        context.SharedPots.Remove(pot);
        await context.SaveChangesAsync(ct);

        return ApiResponse<string>.Success("Kasa silindi.");
    }

    // ── Üye yönetimi (yalnız sahibi) ─────────────────────────────────────────
    public async Task<ApiResponse<SharedPotDetailDto>> AddMemberAsync(int userId, int potId, AddSharedPotMemberDto dto, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, potId, ct);
        if (pot is null) return NotFound();
        if (pot.UserId != userId) return Forbidden();

        if (dto.LinkedUserId.HasValue)
        {
            if (!pot.HouseholdId.HasValue) return Invalid("Bağlı üye yalnızca aile kasasında eklenebilir.");
            if (pot.Members.Any(m => m.LinkedUserId == dto.LinkedUserId.Value)) return Invalid("Bu üye zaten kasada.");
            var validMembers = await HouseholdMemberIdsAsync(pot.HouseholdId.Value, ct);
            if (!validMembers.Contains(dto.LinkedUserId.Value)) return Invalid("Seçilen üye bu ailede değil.");
            var names = await ResolveUserNamesAsync([dto.LinkedUserId.Value], ct);
            context.SharedPotMembers.Add(new SharedPotMember { SharedPotId = potId, Name = names.GetValueOrDefault(dto.LinkedUserId.Value, "Üye"), LinkedUserId = dto.LinkedUserId.Value });
        }
        else
        {
            var mn = dto.Name?.Trim();
            if (string.IsNullOrEmpty(mn)) return Invalid("Üye adı gerekli.");
            if (mn.Length > 80) mn = mn[..80];
            context.SharedPotMembers.Add(new SharedPotMember { SharedPotId = potId, Name = mn, LinkedUserId = null });
        }

        await context.SaveChangesAsync(ct);
        var fresh = await LoadAccessiblePotAsync(userId, potId, ct);
        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, fresh!, ct), "Üye eklendi.");
    }

    public async Task<ApiResponse<SharedPotDetailDto>> RemoveMemberAsync(int userId, int potId, int memberId, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, potId, ct);
        if (pot is null) return NotFound();
        if (pot.UserId != userId) return Forbidden();

        var member = pot.Members.FirstOrDefault(m => m.Id == memberId);
        if (member is null) return NotFound();
        if (member.LinkedUserId == pot.UserId) return Invalid("Kasa sahibi üyelikten çıkarılamaz.");

        var inUse = await context.SharedExpenses.AnyAsync(e => e.SharedPotId == potId && e.PayerMemberId == memberId, ct)
            || await context.SharedExpenseShares.AnyAsync(s => s.MemberId == memberId && s.SharedExpense.SharedPotId == potId, ct)
            || await context.SharedSettlements.AnyAsync(s => s.SharedPotId == potId && (s.FromMemberId == memberId || s.ToMemberId == memberId), ct);
        if (inUse) return ApiResponse<SharedPotDetailDto>.Fail("Masrafı/ödemesi olan üye çıkarılamaz; önce kayıtlarını sil.", 400, errorCode: ErrorCodes.SharedPotMemberInUse);

        context.SharedPotMembers.Remove(member);
        await context.SaveChangesAsync(ct);
        var fresh = await LoadAccessiblePotAsync(userId, potId, ct);
        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, fresh!, ct), "Üye çıkarıldı.");
    }

    // ── Masraf ───────────────────────────────────────────────────────────────
    public async Task<ApiResponse<SharedPotDetailDto>> AddExpenseAsync(int userId, int potId, CreateSharedExpenseDto dto, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, potId, ct);
        if (pot is null) return NotFound();

        var desc = dto.Description?.Trim() ?? string.Empty;
        if (desc.Length is 0 or > 160) return Invalid("Açıklama 1-160 karakter olmalı.");
        if (dto.Amount <= 0) return Invalid("Tutar sıfırdan büyük olmalı.");
        if (dto.Amount > MaxAmount) return Invalid("Tutar çok büyük.");
        if (dto.Note?.Trim().Length > 300) return Invalid("Not en fazla 300 karakter olabilir.");
        if (!Enum.IsDefined(dto.SplitType)) return Invalid("Geçersiz bölüşüm tipi.");

        var memberIds = pot.Members.Select(m => m.Id).ToHashSet();
        if (!memberIds.Contains(dto.PayerMemberId)) return Invalid("Ödeyen üye kasada değil.");

        var amount = decimal.Round(dto.Amount, 2, MidpointRounding.AwayFromZero);
        List<(int memberId, decimal share)> shares;

        if (dto.SplitType == ExpenseSplitType.Equal)
        {
            var parts = (dto.ParticipantMemberIds is { Count: > 0 } ? dto.ParticipantMemberIds : pot.Members.Select(m => m.Id).ToList())
                .Distinct().ToList();
            if (parts.Count == 0) return Invalid("En az bir katılımcı seçilmeli.");
            if (!parts.All(memberIds.Contains)) return Invalid("Katılımcı üye kasada değil.");
            shares = SplitEqual(amount, parts);
        }
        else
        {
            if (dto.ExactShares is not { Count: > 0 }) return Invalid("Tutar bazlı bölüşümde paylar gerekli.");
            if (dto.ExactShares.Any(s => !memberIds.Contains(s.MemberId))) return Invalid("Pay sahibi üye kasada değil.");
            if (dto.ExactShares.Select(s => s.MemberId).Distinct().Count() != dto.ExactShares.Count) return Invalid("Bir üye için birden çok pay girilemez.");
            if (dto.ExactShares.Any(s => s.ShareAmount < 0)) return Invalid("Pay tutarı negatif olamaz.");
            var sum = decimal.Round(dto.ExactShares.Sum(s => s.ShareAmount), 2, MidpointRounding.AwayFromZero);
            if (Math.Abs(sum - amount) > Eps) return Invalid("Payların toplamı tutara eşit olmalı.");
            shares = dto.ExactShares.Where(s => s.ShareAmount > 0)
                .Select(s => (s.MemberId, decimal.Round(s.ShareAmount, 2, MidpointRounding.AwayFromZero))).ToList();
        }

        if (shares.Count == 0) return Invalid("Geçerli pay bulunamadı.");

        var expense = new SharedExpense
        {
            SharedPotId = potId,
            UserId = userId,
            Description = desc,
            Amount = amount,
            ExpenseDate = dto.ExpenseDate ?? DateTime.Now,
            PayerMemberId = dto.PayerMemberId,
            SplitType = dto.SplitType,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
        };
        foreach (var (mid, sh) in shares)
            expense.Shares.Add(new SharedExpenseShare { MemberId = mid, ShareAmount = sh });

        await context.SharedExpenses.AddAsync(expense, ct);
        await context.SaveChangesAsync(ct);

        await NotifyExpenseAsync(pot, expense, shares.Select(s => s.memberId).ToHashSet(), userId, ct);

        var fresh = await LoadAccessiblePotAsync(userId, potId, ct);
        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, fresh!, ct), "Masraf eklendi.", 201);
    }

    public async Task<ApiResponse<SharedPotDetailDto>> DeleteExpenseAsync(int userId, int potId, int expenseId, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, potId, ct);
        if (pot is null) return NotFound();

        var expense = await context.SharedExpenses.Include(e => e.Shares).FirstOrDefaultAsync(e => e.Id == expenseId && e.SharedPotId == potId, ct);
        if (expense is null) return NotFound();
        if (expense.UserId != userId) return Forbidden();

        context.SharedExpenseShares.RemoveRange(expense.Shares);
        context.SharedExpenses.Remove(expense);
        await context.SaveChangesAsync(ct);

        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, pot, ct), "Masraf silindi.");
    }

    // ── Ödeme / netleştirme ──────────────────────────────────────────────────
    public async Task<ApiResponse<SharedPotDetailDto>> AddSettlementAsync(int userId, int potId, CreateSettlementDto dto, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, potId, ct);
        if (pot is null) return NotFound();

        var memberIds = pot.Members.Select(m => m.Id).ToHashSet();
        if (!memberIds.Contains(dto.FromMemberId) || !memberIds.Contains(dto.ToMemberId)) return Invalid("Üye kasada değil.");
        if (dto.FromMemberId == dto.ToMemberId) return Invalid("Ödeyen ve alan aynı üye olamaz.");
        if (dto.Amount <= 0) return Invalid("Tutar sıfırdan büyük olmalı.");
        if (dto.Amount > MaxAmount) return Invalid("Tutar çok büyük.");
        if (dto.Note?.Trim().Length > 300) return Invalid("Not en fazla 300 karakter olabilir.");

        var settlement = new SharedSettlement
        {
            SharedPotId = potId,
            UserId = userId,
            FromMemberId = dto.FromMemberId,
            ToMemberId = dto.ToMemberId,
            Amount = decimal.Round(dto.Amount, 2, MidpointRounding.AwayFromZero),
            SettledOn = dto.SettledOn ?? DateTime.Now,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
        };
        await context.SharedSettlements.AddAsync(settlement, ct);
        await context.SaveChangesAsync(ct);

        await NotifySettlementAsync(pot, settlement, userId, ct);

        var fresh = await LoadAccessiblePotAsync(userId, potId, ct);
        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, fresh!, ct), "Ödeme kaydedildi.", 201);
    }

    public async Task<ApiResponse<SharedPotDetailDto>> DeleteSettlementAsync(int userId, int potId, int settlementId, CancellationToken ct = default)
    {
        var pot = await LoadAccessiblePotAsync(userId, potId, ct);
        if (pot is null) return NotFound();

        var settlement = await context.SharedSettlements.FirstOrDefaultAsync(s => s.Id == settlementId && s.SharedPotId == potId, ct);
        if (settlement is null) return NotFound();
        if (settlement.UserId != userId) return Forbidden();

        context.SharedSettlements.Remove(settlement);
        await context.SaveChangesAsync(ct);

        return ApiResponse<SharedPotDetailDto>.Success(await BuildDetailAsync(userId, pot, ct), "Ödeme silindi.");
    }

    // ── Üye adayları ───────────────────────────────────────────────────────
    public async Task<ApiResponse<IReadOnlyList<SharedPotCandidateDto>>> GetMemberCandidatesAsync(int userId, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, ct);
        if (!scope.HasValue) return ApiResponse<IReadOnlyList<SharedPotCandidateDto>>.Success([]);

        var candidates = await context.HouseholdMembers
            .AsNoTracking()
            .Where(m => m.HouseholdId == scope.Value && m.Status == HouseholdMemberStatus.Active && m.UserId != userId)
            .Include(m => m.User)
            .Select(m => new SharedPotCandidateDto { UserId = m.UserId, Name = $"{m.User.FirstName} {m.User.LastName}".Trim() })
            .ToListAsync(ct);

        return ApiResponse<IReadOnlyList<SharedPotCandidateDto>>.Success(candidates);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────
    private Task<int?> ResolveScopeAsync(int userId, CancellationToken ct) =>
        HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);

    private IQueryable<SharedPot> ScopeQuery(int userId, int? scope) =>
        scope.HasValue
            ? context.SharedPots.Where(p => p.HouseholdId == scope.Value)
            : context.SharedPots.Where(p => p.HouseholdId == null && p.UserId == userId);

    /// <summary>Kasayı üyeleriyle yükler ve erişimi doğrular (aile üyeliği ya da kişisel sahiplik). Yoksa null.</summary>
    private async Task<SharedPot?> LoadAccessiblePotAsync(int userId, int potId, CancellationToken ct)
    {
        var pot = await context.SharedPots.Include(p => p.Members).FirstOrDefaultAsync(p => p.Id == potId, ct);
        if (pot is null) return null;

        if (pot.HouseholdId.HasValue)
        {
            var scope = await ResolveScopeAsync(userId, ct);
            return scope.HasValue && pot.HouseholdId == scope.Value ? pot : null;
        }
        return pot.UserId == userId ? pot : null;
    }

    private async Task<HashSet<int>> HouseholdMemberIdsAsync(int householdId, CancellationToken ct)
    {
        var ids = await context.HouseholdMembers
            .AsNoTracking()
            .Where(m => m.HouseholdId == householdId && m.Status == HouseholdMemberStatus.Active)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    private async Task<Dictionary<int, string>> ResolveUserNamesAsync(IEnumerable<int> userIds, CancellationToken ct)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        var users = await context.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .ToListAsync(ct);
        return users.ToDictionary(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim());
    }

    private async Task<SharedPotDetailDto> BuildDetailAsync(int userId, SharedPot pot, CancellationToken ct)
    {
        var members = pot.Members.OrderBy(m => m.Id).ToList();
        var expenses = await context.SharedExpenses
            .AsNoTracking()
            .Include(e => e.Shares)
            .Where(e => e.SharedPotId == pot.Id)
            .OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.Id)
            .ToListAsync(ct);
        var settlements = await context.SharedSettlements
            .AsNoTracking()
            .Where(s => s.SharedPotId == pot.Id)
            .OrderByDescending(s => s.SettledOn).ThenByDescending(s => s.Id)
            .ToListAsync(ct);

        var nameById = members.ToDictionary(m => m.Id, m => m.Name);
        var allShares = expenses.SelectMany(e => e.Shares.Select(s => (s.MemberId, s.ShareAmount))).ToList();
        var balances = ComputeBalances(
            members.Select(m => m.Id),
            expenses.Select(e => (e.PayerMemberId, e.Amount)),
            allShares,
            settlements.Select(s => (s.FromMemberId, s.ToMemberId, s.Amount)));

        var memberDtos = members.Select(m =>
        {
            var b = balances[m.Id];
            return new SharedPotMemberDto
            {
                Id = m.Id,
                Name = m.Name,
                LinkedUserId = m.LinkedUserId,
                IsSelf = m.LinkedUserId == userId,
                Paid = b.paid,
                Owed = b.owed,
                Balance = b.balance,
            };
        }).ToList();

        var expenseDtos = expenses.Select(e => new SharedExpenseDto
        {
            Id = e.Id,
            Description = e.Description,
            Amount = e.Amount,
            ExpenseDate = e.ExpenseDate,
            PayerMemberId = e.PayerMemberId,
            PayerName = nameById.GetValueOrDefault(e.PayerMemberId, "—"),
            SplitType = e.SplitType,
            Note = e.Note,
            CanEdit = e.UserId == userId,
            CreatedDate = e.CreatedDate,
            Shares = e.Shares.Select(s => new SharedExpenseShareDto
            {
                MemberId = s.MemberId,
                MemberName = nameById.GetValueOrDefault(s.MemberId, "—"),
                ShareAmount = s.ShareAmount,
            }).ToList(),
        }).ToList();

        var settlementDtos = settlements.Select(s => new SharedSettlementDto
        {
            Id = s.Id,
            FromMemberId = s.FromMemberId,
            FromName = nameById.GetValueOrDefault(s.FromMemberId, "—"),
            ToMemberId = s.ToMemberId,
            ToName = nameById.GetValueOrDefault(s.ToMemberId, "—"),
            Amount = s.Amount,
            SettledOn = s.SettledOn,
            Note = s.Note,
            CanEdit = s.UserId == userId,
        }).ToList();

        return new SharedPotDetailDto
        {
            Id = pot.Id,
            Name = pot.Name,
            Currency = pot.Currency,
            Note = pot.Note,
            Status = pot.Status,
            IsOwner = pot.UserId == userId,
            MyMemberId = members.FirstOrDefault(m => m.LinkedUserId == userId)?.Id,
            TotalSpent = expenses.Sum(e => e.Amount),
            CreatedDate = pot.CreatedDate,
            Members = memberDtos,
            Expenses = expenseDtos,
            Settlements = settlementDtos,
            Suggestions = Simplify(memberDtos),
        };
    }

    /// <summary>Üye başına net bakiye: ödediği − payı + verdiği ödeme − aldığı ödeme. Toplam ≈ 0.</summary>
    private static Dictionary<int, (decimal paid, decimal owed, decimal balance)> ComputeBalances(
        IEnumerable<int> memberIds,
        IEnumerable<(int payerMemberId, decimal amount)> expenses,
        IEnumerable<(int memberId, decimal shareAmount)> shares,
        IEnumerable<(int fromMemberId, int toMemberId, decimal amount)> settlements)
    {
        var paid = new Dictionary<int, decimal>();
        var owed = new Dictionary<int, decimal>();
        var settledOut = new Dictionary<int, decimal>();
        var settledIn = new Dictionary<int, decimal>();
        var ids = memberIds.ToList();
        foreach (var id in ids) { paid[id] = 0; owed[id] = 0; settledOut[id] = 0; settledIn[id] = 0; }

        foreach (var (payer, amount) in expenses)
            if (paid.ContainsKey(payer)) paid[payer] += amount;
        foreach (var (mid, sh) in shares)
            if (owed.ContainsKey(mid)) owed[mid] += sh;
        foreach (var (from, to, amount) in settlements)
        {
            if (settledOut.ContainsKey(from)) settledOut[from] += amount;
            if (settledIn.ContainsKey(to)) settledIn[to] += amount;
        }

        return ids.ToDictionary(id => id, id =>
        {
            var bal = decimal.Round(paid[id] - owed[id] + settledOut[id] - settledIn[id], 2, MidpointRounding.AwayFromZero);
            return (decimal.Round(paid[id], 2), decimal.Round(owed[id], 2), bal);
        });
    }

    /// <summary>Tutarı katılımcılara eşit böler; kuruş artığını ilk katılımcılara dağıtır (toplam = tutar).</summary>
    private static List<(int memberId, decimal share)> SplitEqual(decimal amount, IReadOnlyList<int> memberIds)
    {
        var n = memberIds.Count;
        var cents = (long)decimal.Round(amount * 100m, MidpointRounding.AwayFromZero);
        var per = cents / n;
        var rem = (int)(cents % n);
        var result = new List<(int, decimal)>(n);
        for (var i = 0; i < n; i++)
            result.Add((memberIds[i], (per + (i < rem ? 1 : 0)) / 100m));
        return result;
    }

    /// <summary>Net bakiyeleri minimum transferle kapatan öneriler (en büyük borçlu ↔ en büyük alacaklı).</summary>
    private static List<SettlementSuggestionDto> Simplify(IReadOnlyList<SharedPotMemberDto> members)
    {
        var creditors = members.Where(m => m.Balance > Eps)
            .Select(m => new MutBal(m.Id, m.Name, m.Balance)).OrderByDescending(x => x.Amount).ToList();
        var debtors = members.Where(m => m.Balance < -Eps)
            .Select(m => new MutBal(m.Id, m.Name, -m.Balance)).OrderByDescending(x => x.Amount).ToList();

        var result = new List<SettlementSuggestionDto>();
        int ci = 0, di = 0;
        while (ci < creditors.Count && di < debtors.Count)
        {
            var c = creditors[ci];
            var d = debtors[di];
            var pay = Math.Min(c.Amount, d.Amount);
            if (pay > Eps)
            {
                result.Add(new SettlementSuggestionDto
                {
                    FromMemberId = d.Id, FromName = d.Name,
                    ToMemberId = c.Id, ToName = c.Name,
                    Amount = decimal.Round(pay, 2, MidpointRounding.AwayFromZero),
                });
                c.Amount -= pay;
                d.Amount -= pay;
            }
            if (c.Amount <= Eps) ci++;
            if (d.Amount <= Eps) di++;
        }
        return result;
    }

    private sealed class MutBal(int id, string name, decimal amount)
    {
        public int Id { get; } = id;
        public string Name { get; } = name;
        public decimal Amount { get; set; } = amount;
    }

    private static string NormalizeCurrency(string? c) =>
        string.IsNullOrWhiteSpace(c) ? "TRY" : c.Trim().ToUpperInvariant() is { Length: <= 8 } v ? v : "TRY";

    // ── Bildirimler ───────────────────────────────────────────────────────────
    private async Task NotifyExpenseAsync(SharedPot pot, SharedExpense expense, HashSet<int> participantMemberIds, int actorUserId, CancellationToken ct)
    {
        var recipients = pot.Members
            .Where(m => m.LinkedUserId.HasValue && m.LinkedUserId.Value != actorUserId && participantMemberIds.Contains(m.Id))
            .Select(m => m.LinkedUserId!.Value).Distinct().ToList();
        if (recipients.Count == 0) return;

        var actorName = pot.Members.FirstOrDefault(m => m.LinkedUserId == actorUserId)?.Name ?? "Bir üye";
        foreach (var uid in recipients)
        {
            var payload = JsonSerializer.Serialize(new { potId = pot.Id, potName = pot.Name, expenseId = expense.Id, description = expense.Description, amount = expense.Amount, currency = pot.Currency, actor = actorName });
            var envelope = new NotificationEnvelope(
                UserId: uid,
                Type: NotificationType.SharedPotExpenseAdded,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_sharedpot_expenseAdded_title",
                MessageKey: "notif_sharedpot_expenseAdded_body",
                Payload: payload,
                RefType: "sharedpot",
                RefId: pot.Id,
                DedupKey: $"sharedpot:{pot.Id}:expense:{expense.Id}:{uid}",
                PushTitle: "Ortak kasa",
                PushBody: $"{pot.Name}: {expense.Description} ({expense.Amount:N2} {pot.Currency})");
            try { await dispatcher.DispatchAsync(envelope, ct); }
            catch (Exception ex) { logger.LogWarning(ex, "SharedPot masraf bildirimi gönderilemedi (user {UserId}).", uid); }
        }
    }

    private async Task NotifySettlementAsync(SharedPot pot, SharedSettlement settlement, int actorUserId, CancellationToken ct)
    {
        var recipients = pot.Members
            .Where(m => (m.Id == settlement.FromMemberId || m.Id == settlement.ToMemberId)
                     && m.LinkedUserId.HasValue && m.LinkedUserId.Value != actorUserId)
            .Select(m => m.LinkedUserId!.Value).Distinct().ToList();
        if (recipients.Count == 0) return;

        var fromName = pot.Members.FirstOrDefault(m => m.Id == settlement.FromMemberId)?.Name ?? "—";
        var toName = pot.Members.FirstOrDefault(m => m.Id == settlement.ToMemberId)?.Name ?? "—";
        foreach (var uid in recipients)
        {
            var payload = JsonSerializer.Serialize(new { potId = pot.Id, potName = pot.Name, settlementId = settlement.Id, from = fromName, to = toName, amount = settlement.Amount, currency = pot.Currency });
            var envelope = new NotificationEnvelope(
                UserId: uid,
                Type: NotificationType.SharedPotSettlementRecorded,
                Severity: NotificationSeverity.Info,
                TitleKey: "notif_sharedpot_settled_title",
                MessageKey: "notif_sharedpot_settled_body",
                Payload: payload,
                RefType: "sharedpot",
                RefId: pot.Id,
                DedupKey: $"sharedpot:{pot.Id}:settle:{settlement.Id}:{uid}",
                PushTitle: "Ortak kasa",
                PushBody: $"{pot.Name}: {fromName} → {toName} {settlement.Amount:N2} {pot.Currency}");
            try { await dispatcher.DispatchAsync(envelope, ct); }
            catch (Exception ex) { logger.LogWarning(ex, "SharedPot ödeme bildirimi gönderilemedi (user {UserId}).", uid); }
        }
    }

    // ── Hata yardımcıları ──────────────────────────────────────────────────────
    private static ApiResponse<SharedPotDetailDto> NotFound() =>
        ApiResponse<SharedPotDetailDto>.Fail("Kasa bulunamadı.", 404, errorCode: ErrorCodes.SharedPotNotFound);
    private static ApiResponse<SharedPotDetailDto> Forbidden() =>
        ApiResponse<SharedPotDetailDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);
    private static ApiResponse<SharedPotDetailDto> Invalid(string msg) =>
        ApiResponse<SharedPotDetailDto>.Fail(msg, 400, errorCode: ErrorCodes.SharedPotInvalidInput);
}
