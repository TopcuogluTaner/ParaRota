using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class DebtService(
    AppDbContext context,
    IMapper mapper,
    ICurrentUserService currentUser,
    IRecurringRuleService recurringRuleService,
    INotificationDispatcher dispatcher,
    IOptions<DebtReminderSettings> reminderOptions,
    ILogger<DebtService> logger) : IDebtService
{
    private const string SystemDebtCategoryName = "Borç Ödeme";

    // ------------------------------------------------------------------
    //  Queries
    // ------------------------------------------------------------------
    public async Task<ApiResponse<IReadOnlyList<DebtListItemDto>>> GetMyDebtsAsync(int userId, DebtStatus? status, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var query = scope.HasValue
            ? context.Debts.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Debts.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        // Memory safety: paginated DTO eklenene kadar 500'lük üst sınır.
        var items = await query
            .OrderBy(x => x.Status)
            .ThenBy(x => x.NextDueDate ?? x.DueDate ?? DateTime.MaxValue)
            .ThenByDescending(x => x.Id)
            .Take(500)
            .ToListAsync(cancellationToken);

        var dtos = mapper.Map<IReadOnlyList<DebtListItemDto>>(items);
        return ApiResponse<IReadOnlyList<DebtListItemDto>>.Success(dtos);
    }

    public async Task<ApiResponse<DebtDto>> GetByIdAsync(int userId, int debtId, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Debts.AsNoTracking()
                .Include(x => x.Payments)
                .FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Debts.AsNoTracking()
                .Include(x => x.Payments)
                .FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<DebtDto>.Fail("Borç kaydı bulunamadı.", 404, errorCode: ErrorCodes.DebtNotFound);

        return ApiResponse<DebtDto>.Success(mapper.Map<DebtDto>(entity));
    }

    // ------------------------------------------------------------------
    //  Commands
    // ------------------------------------------------------------------
    public async Task<ApiResponse<DebtDto>> CreateAsync(int userId, CreateDebtDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var targetHouseholdId = scope;
        if (dto.HouseholdId.HasValue)
        {
            var access = await HouseholdScope.CheckMemberAccessAsync(context, userId, dto.HouseholdId.Value, cancellationToken);

            if (access == HouseholdAccess.NotMember)
                return ApiResponse<DebtDto>.Fail("Bu aileye erişiminiz yok.", 403, errorCode: ErrorCodes.HouseholdAccessDenied);

            if (access == HouseholdAccess.PremiumRequired)
                return ApiResponse<DebtDto>.Fail("Bu özellik premium üyelik gerektirir.", 403, errorCode: ErrorCodes.PremiumRequired);
            targetHouseholdId = dto.HouseholdId;
        }

        var currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency.Trim().ToUpperInvariant();

        // Basit (düz) faiz: girilen Amount anaparadır. Faiz oranı varsa toplam borç =
        // anapara × (1 + oran/100). Bu toplamı Amount + RemainingAmount olarak saklarız;
        // böylece taksitler (Amount/count), kalan bakiye, auto-mod recurring kuralı ve
        // frontend taksit takvimi otomatik olarak faizi içerir (ek hesap gerekmez).
        var interestRate = dto.InterestRate ?? 0m;
        var effectiveAmount = interestRate > 0
            ? Math.Round(dto.Amount * (1 + interestRate / 100m), 2, MidpointRounding.AwayFromZero)
            : dto.Amount;

        var entity = new Debt
        {
            UserId = userId,
            HouseholdId = targetHouseholdId,
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Kind = dto.Kind,
            Amount = effectiveAmount,
            Currency = currency,
            RemainingAmount = effectiveAmount,
            CounterpartyName = dto.CounterpartyName.Trim(),
            InterestRate = dto.InterestRate,
            StartDate = dto.StartDate,
            DueDate = dto.DueDate,
            InstallmentCount = dto.InstallmentCount,
            InstallmentFrequency = dto.InstallmentFrequency,
            PaymentMode = dto.PaymentMode,
            Status = DebtStatus.Active,
            NextDueDate = ComputeInitialNextDueDate(dto),
        };

        // Auto mod seçildiyse Debt + RecurringRule ATOMIC olmalı: rule yaratılamazsa
        // Debt de kaydedilmemeli, yoksa kullanıcı Auto olduğunu sanıp manuel ödeme yapmaz.
        await using var dbTx = await context.Database.BeginTransactionAsync(cancellationToken);

        await context.Debts.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        if (dto.PaymentMode == PaymentMode.Auto && dto.InstallmentCount is int count && count > 0 && dto.InstallmentFrequency.HasValue)
        {
            var (rule, ruleErr) = await TryCreateLinkedRuleAsync(userId, entity, dto.InstallmentFrequency.Value, count, cancellationToken);

            if (rule is null)
            {
                await dbTx.RollbackAsync(cancellationToken);
                return ApiResponse<DebtDto>.Fail(
                    $"Auto modunda taksit planı oluşturulamadı: {ruleErr ?? "bilinmeyen hata"}. Manuel moda geçip tekrar deneyin.",
                    400,
                    errorCode: ErrorCodes.DebtAutoPlanFailed);
            }

            entity.LinkedRecurringRuleId = rule.Id;
            await context.SaveChangesAsync(cancellationToken);

            // RecurringRuleService.CreateAsync, NextRunDate <= now ise taksitleri ANINDA üretir —
            // ama o sırada Debt henüz link'li değildi, dolayısıyla SyncLinkedDebtAsync atlandı.
            // Şimdi link kurulduğuna göre reconcile et: üretilmiş taksitler borca işlensin
            // (geçmiş-tarihli auto borcun stuck kalmasını önler). İdempotent.
            await recurringRuleService.ReconcileLinkedDebtAsync(rule.Id, cancellationToken);
        }

        await dbTx.CommitAsync(cancellationToken);

        var created = await ReloadAsync(entity.Id, cancellationToken);
        return ApiResponse<DebtDto>.Success(mapper.Map<DebtDto>(created!), "Borç kaydı eklendi.", 201);
    }

    public async Task<ApiResponse<DebtDto>> UpdateAsync(int userId, int debtId, UpdateDebtDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Debts.FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Debts.FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<DebtDto>.Fail("Borç kaydı bulunamadı.", 404, errorCode: ErrorCodes.DebtNotFound);

        if (entity.Status == DebtStatus.Completed)
            return ApiResponse<DebtDto>.Fail("Tamamlanmış borç güncellenemez.", 409, errorCode: ErrorCodes.DebtCompletedImmutable);

        // Sahiplik kuralı: her kaydı yalnız oluşturan düzenler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<DebtDto>.Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerEdits);

        // Status sadece Active <-> Cancelled (validator ek olarak zorlar).
        if (dto.Status != DebtStatus.Active && dto.Status != DebtStatus.Cancelled)
            return ApiResponse<DebtDto>.Fail("Geçersiz status geçişi.", 400, errorCode: ErrorCodes.DebtInvalidStatusTransition);

        entity.Title = dto.Title.Trim();
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.CounterpartyName = dto.CounterpartyName.Trim();
        entity.InterestRate = dto.InterestRate;
        entity.DueDate = dto.DueDate;
        entity.Status = dto.Status;

        await context.SaveChangesAsync(cancellationToken);

        var updated = await ReloadAsync(entity.Id, cancellationToken);
        return ApiResponse<DebtDto>.Success(mapper.Map<DebtDto>(updated!), "Borç kaydı güncellendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int debtId, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Debts.FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Debts.FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Borç kaydı bulunamadı.", 404, errorCode: ErrorCodes.DebtNotFound);

        // Sahiplik kuralı: her kaydı yalnız oluşturan siler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<string>.Fail("Bu kaydı yalnız oluşturan silebilir.", 403, errorCode: ErrorCodes.OnlyOwnerDeletes);

        // Linked recurring rule (Auto mode) varsa orphan kalmasın — Debt silinince
        // otomatik plan da silinmeli, yoksa scheduler ilerideki periyodlarda
        // sahipsiz transaction üretmeye devam eder.
        var linkedRuleId = entity.LinkedRecurringRuleId;

        context.Debts.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        if (linkedRuleId.HasValue)
        {
            // RecurringRuleService.DeleteAsync user/scope kontrolünü kendi yapar; hatayı
            // sessizce yutarız (Debt zaten silindi, fallback olarak rule orphan kalsa bile
            // ileride manuel temizlenebilir).
            await recurringRuleService.DeleteAsync(userId, linkedRuleId.Value, cancellationToken);
        }

        return ApiResponse<string>.Success("", "Borç kaydı silindi.");
    }

    public async Task<ApiResponse<DebtDto>> AddPaymentAsync(int userId, int debtId, AddDebtPaymentDto dto, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);

        var entity = scope.HasValue
            ? await context.Debts.FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == scope.Value, cancellationToken)
            : await context.Debts.FirstOrDefaultAsync(x => x.Id == debtId && x.HouseholdId == null && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<DebtDto>.Fail("Borç kaydı bulunamadı.", 404, errorCode: ErrorCodes.DebtNotFound);

        if (entity.Status != DebtStatus.Active)
            return ApiResponse<DebtDto>.Fail("Sadece aktif borç kayıtlarına ödeme eklenebilir.", 409, errorCode: ErrorCodes.DebtPaymentOnlyActive);

        // Sahiplik kuralı: borca yalnız oluşturan ödeme ekler — aile kaydı olsa bile owner/admin değil.
        if (entity.UserId != userId)
            return ApiResponse<DebtDto>.Fail("Bu kayda yalnız oluşturan ödeme ekleyebilir.", 403, errorCode: ErrorCodes.OnlyOwnerAddsPayment);

        if (dto.Amount <= 0)
            return ApiResponse<DebtDto>.Fail("Ödeme tutarı sıfırdan büyük olmalı.", 400, errorCode: ErrorCodes.PaymentAmountPositive);

        if (dto.Amount > entity.RemainingAmount)
            return ApiResponse<DebtDto>.Fail("Ödeme tutarı kalan bakiyeyi aşamaz.", 400, errorCode: ErrorCodes.PaymentExceedsBalance);

        // Linked Tx + DebtPayment + Debt state güncellemeleri ATOMIC olmalı.
        // Aksi takdirde, ikinci SaveChanges hata verirse: Transaction kaydedildi ama
        // RemainingAmount/Status güncellenmedi → muhasebe tutarsızlığı.
        await using var dbTx = await context.Database.BeginTransactionAsync(cancellationToken);

        // Opsiyonel linked Transaction önce yarat — TransactionId hemen bağlanır.
        int? linkedTransactionId = null;
        if (dto.CreateLinkedTransaction)
        {
            var txType = entity.Kind == DebtKind.Payable ? TransactionType.Expense : TransactionType.Income;

            // Sistem "Borç Ödeme" kategorisi (varsa) — yoksa scope içinden ilk uygun kategoriyi
            // bul; bulunamazsa transaction'sız kalır (caller tx istemiyorsa veya kategori
            // bulunamadığında DebtPayment yine de yazılır).
            var categoryId = await ResolveDebtCategoryIdAsync(userId, entity.HouseholdId, txType, cancellationToken);
            if (categoryId.HasValue)
            {
                var tx = new Transaction
                {
                    UserId = userId,
                    HouseholdId = entity.HouseholdId,
                    CategoryId = categoryId.Value,
                    Type = txType,
                    Nature = TransactionNature.Fixed,
                    Status = TransactionStatus.Completed,
                    Source = TransactionSource.Manual,
                    Amount = dto.Amount,
                    Currency = entity.Currency,
                    TransactionDate = dto.PaymentDate,
                    Notes = string.IsNullOrWhiteSpace(dto.Notes)
                        ? $"{entity.Title} — {entity.CounterpartyName}"
                        : dto.Notes.Trim(),
                };

                await context.Transactions.AddAsync(tx, cancellationToken);
                await context.SaveChangesAsync(cancellationToken);
                linkedTransactionId = tx.Id;
            }
        }

        var payment = new DebtPayment
        {
            DebtId = entity.Id,
            Amount = dto.Amount,
            PaymentDate = dto.PaymentDate,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            TransactionId = linkedTransactionId,
        };

        await context.DebtPayments.AddAsync(payment, cancellationToken);

        // Lost-update koruması: bakiye bellekteki (bayat olabilecek) kopyadan değil DB'deki
        // güncel değerden atomik düşülür; UPDATE'in satır kilidi eşzamanlı ikinci ödemeyi
        // commit'e kadar bekletir, koşul da yarışta bakiye aşımını engeller.
        var decremented = await context.Debts
            .Where(d => d.Id == entity.Id && d.Status == DebtStatus.Active && d.RemainingAmount >= dto.Amount)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.RemainingAmount, d => d.RemainingAmount - dto.Amount), cancellationToken);
        if (decremented == 0)
        {
            await dbTx.RollbackAsync(cancellationToken);
            return ApiResponse<DebtDto>.Fail("Ödeme tutarı kalan bakiyeyi aşamaz.", 409, errorCode: ErrorCodes.PaymentExceedsBalance);
        }

        // Tracked kopyayı DB'deki güncel bakiyeyle hizala — aşağıdaki status/NextDueDate
        // hesapları güncel değeri kullansın.
        await context.Entry(entity).ReloadAsync(cancellationToken);

        // NextDueDate'i bir sonraki periyoda ilerlet (frequency biliniyorsa).
        if (entity.RemainingAmount > 0 && entity.InstallmentFrequency.HasValue && entity.NextDueDate.HasValue)
        {
            entity.NextDueDate = AddFrequency(entity.NextDueDate.Value, entity.InstallmentFrequency.Value);
        }

        if (entity.RemainingAmount <= 0)
        {
            entity.RemainingAmount = 0m;
            entity.Status = DebtStatus.Completed;
            entity.NextDueDate = null;
        }

        await context.SaveChangesAsync(cancellationToken);
        await dbTx.CommitAsync(cancellationToken);

        // Bildirimler — transaction dışında (best-effort, hata akışı bozmamalı).
        try
        {
            if (entity.Status == DebtStatus.Completed)
            {
                var payload = JsonSerializer.Serialize(new
                {
                    debtId = entity.Id,
                    title = entity.Title,
                    amount = entity.Amount,
                    currency = entity.Currency,
                });

                var envelope = new NotificationEnvelope(
                    UserId: userId,
                    Type: NotificationType.DebtCompleted,
                    Severity: NotificationSeverity.Success,
                    TitleKey: "notif_debt_completed_title",
                    MessageKey: "notif_debt_completed_body",
                    Payload: payload,
                    RefType: "debt",
                    RefId: entity.Id,
                    DedupKey: $"debt:{entity.Id}:completed",
                    PushTitle: "Borç kapandı",
                    PushBody: $"{entity.Title} kapandı.");

                await dispatcher.DispatchAsync(envelope, cancellationToken);
            }

            // Household scope ise diğer aktif üyelere "ödeme kaydedildi" bildirimi.
            if (entity.HouseholdId.HasValue)
            {
                var otherMembers = await context.HouseholdMembers
                    .AsNoTracking()
                    .Where(m => m.HouseholdId == entity.HouseholdId.Value
                             && m.Status == HouseholdMemberStatus.Active
                             && m.UserId != userId)
                    .Select(m => m.UserId)
                    .ToListAsync(cancellationToken);

                foreach (var mid in otherMembers)
                {
                    var payload = JsonSerializer.Serialize(new
                    {
                        debtId = entity.Id,
                        title = entity.Title,
                        amount = dto.Amount,
                        remainingAmount = entity.RemainingAmount,
                        currency = entity.Currency,
                        paidByUserId = userId,
                    });

                    var envelope = new NotificationEnvelope(
                        UserId: mid,
                        Type: NotificationType.DebtPaymentRecorded,
                        Severity: NotificationSeverity.Info,
                        TitleKey: "notif_debt_paymentRecorded_title",
                        MessageKey: "notif_debt_paymentRecorded_body",
                        Payload: payload,
                        RefType: "debt",
                        RefId: entity.Id,
                        DedupKey: $"debt:{entity.Id}:payment:{payment.Id}:{mid}",
                        PushTitle: "Borç ödemesi kaydedildi",
                        PushBody: $"{entity.Title}: {dto.Amount:N2} {entity.Currency}");

                    await dispatcher.DispatchAsync(envelope, cancellationToken);
                }
            }
        }
        catch
        {
            // Bildirim hatası ödeme akışını bozmaz.
        }

        var updated = await ReloadAsync(entity.Id, cancellationToken);
        return ApiResponse<DebtDto>.Success(mapper.Map<DebtDto>(updated!), "Ödeme kaydedildi.");
    }

    // ------------------------------------------------------------------
    //  Hangfire job: vadesi yaklaşan ödeme hatırlatmaları
    // ------------------------------------------------------------------
    public async Task<int> SendDuePaymentRemindersAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.Now;
        var today = now.Date;
        var horizonDays = Math.Max(1, reminderOptions.Value.HorizonDays);
        var horizon = now.AddDays(horizonDays);
        logger.LogInformation("Debt due-reminder job başladı (horizon: {Days} gün).", horizonDays);

        // Tracking aktif — LastReminderSentDate'i güncelleyebilmek için gerekli.
        // Filtre: aynı debt için aynı gün ikinci reminder gönderilmez (spam guard).
        var dueDebts = await context.Debts
            .Where(d => d.Status == DebtStatus.Active
                     && d.NextDueDate != null
                     && d.NextDueDate <= horizon
                     && (d.LastReminderSentDate == null || d.LastReminderSentDate < today))
            .ToListAsync(cancellationToken);

        if (dueDebts.Count == 0)
        {
            logger.LogInformation("Debt due-reminder job: hatırlatma gerekli kayıt yok.");
            return 0;
        }

        var sent = 0;
        var failed = 0;

        foreach (var debt in dueDebts)
        {
            // Hedef alıcılar: household scope ise tüm aktif üyeler, değilse creator.
            List<int> recipients;
            if (debt.HouseholdId.HasValue)
            {
                recipients = await context.HouseholdMembers
                    .AsNoTracking()
                    .Where(m => m.HouseholdId == debt.HouseholdId.Value && m.Status == HouseholdMemberStatus.Active)
                    .Select(m => m.UserId)
                    .ToListAsync(cancellationToken);
            }
            else
            {
                recipients = new List<int> { debt.UserId };
            }

            var daysUntilDue = (int)Math.Floor((debt.NextDueDate!.Value.Date - now.Date).TotalDays);
            if (daysUntilDue < 0) daysUntilDue = 0;

            var payload = JsonSerializer.Serialize(new
            {
                debtId = debt.Id,
                title = debt.Title,
                counterpartyName = debt.CounterpartyName,
                remainingAmount = debt.RemainingAmount,
                daysUntilDue,
                currency = debt.Currency,
            });

            var dedupBase = $"debt:{debt.Id}:dueSoon:{debt.NextDueDate:yyyy-MM-dd}";
            var atLeastOneSent = false;

            foreach (var uid in recipients)
            {
                var envelope = new NotificationEnvelope(
                    UserId: uid,
                    Type: NotificationType.DebtDueSoon,
                    Severity: NotificationSeverity.Warning,
                    TitleKey: "notif_debt_dueSoon_title",
                    MessageKey: "notif_debt_dueSoon_body",
                    Payload: payload,
                    RefType: "debt",
                    RefId: debt.Id,
                    // Aile durumunda her alıcı için farklı dedup; idempotent kalır.
                    DedupKey: recipients.Count > 1 ? $"{dedupBase}:{uid}" : dedupBase,
                    PushTitle: "Yaklaşan ödeme",
                    PushBody: $"{debt.Title}: {debt.RemainingAmount:N2} {debt.Currency} (kalan)");

                try
                {
                    await dispatcher.DispatchAsync(envelope, cancellationToken);
                    sent++;
                    atLeastOneSent = true;
                }
                catch (Exception ex)
                {
                    // Tek bir alıcıdaki hata diğerlerini engellemesin; sayım + log.
                    failed++;
                    logger.LogWarning(ex, "Debt {DebtId} için user {UserId} reminder gönderilemedi.", debt.Id, uid);
                }
            }

            // En az 1 alıcıya başarıyla gönderildiyse aynı gün ikinci kez gönderme.
            // Tümüyle fail'se LastReminderSentDate güncellenmez → yarınki run tekrar dener.
            if (atLeastOneSent)
            {
                debt.LastReminderSentDate = today;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Debt due-reminder job tamamlandı: {Sent} bildirim gönderildi, {Failed} hata.", sent, failed);
        return sent;
    }

    // ------------------------------------------------------------------
    //  Helpers
    // ------------------------------------------------------------------
    private Task<Debt?> ReloadAsync(int id, CancellationToken cancellationToken)
        => context.Debts
            .AsNoTracking()
            .Include(x => x.Payments)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    private static DateTime? ComputeInitialNextDueDate(CreateDebtDto dto)
    {
        if (dto.DueDate.HasValue) return dto.DueDate;
        if (dto.InstallmentFrequency.HasValue)
            return AddFrequency(dto.StartDate, dto.InstallmentFrequency.Value);
        return dto.StartDate;
    }

    private static DateTime AddFrequency(DateTime from, DebtFrequency frequency) => frequency switch
    {
        DebtFrequency.Weekly => from.AddDays(7),
        DebtFrequency.Biweekly => from.AddDays(14),
        DebtFrequency.Monthly => from.AddMonths(1),
        DebtFrequency.Yearly => from.AddYears(1),
        _ => from.AddMonths(1),
    };

    private static RecurringFrequency MapToRecurringFrequency(DebtFrequency frequency) => frequency switch
    {
        // RecurringRule altyapısında Biweekly yok; en yakın eşleştirme Weekly olur.
        DebtFrequency.Weekly => RecurringFrequency.Weekly,
        DebtFrequency.Biweekly => RecurringFrequency.Weekly,
        DebtFrequency.Monthly => RecurringFrequency.Monthly,
        DebtFrequency.Yearly => RecurringFrequency.Yearly,
        _ => RecurringFrequency.Monthly,
    };

    private async Task<(RecurringRuleDto? rule, string? error)> TryCreateLinkedRuleAsync(
        int userId,
        Debt debt,
        DebtFrequency frequency,
        int installmentCount,
        CancellationToken cancellationToken)
    {
        var txType = debt.Kind == DebtKind.Payable ? TransactionType.Expense : TransactionType.Income;
        var categoryId = await ResolveDebtCategoryIdAsync(userId, debt.HouseholdId, txType, cancellationToken);
        if (!categoryId.HasValue)
            return (null, "Borç ödemeleri için uygun bir kategori bulunamadı.");

        var perInstallment = Math.Round(debt.Amount / installmentCount, 2, MidpointRounding.AwayFromZero);
        // N taksit = StartDate, +1·freq, ..., +(N-1)·freq → son taksit StartDate + (N-1)·freq.
        // RunDueAsync döngüsü `run <= EndDate` (kapsayıcı) olduğundan EndDate son taksit tarihidir;
        // installmentCount (yerine count-1) verirsek N+1 işlem üretilir (defter şişer).
        var endDate = AddFrequencyTimes(debt.StartDate, frequency, installmentCount - 1);

        var createDto = new CreateRecurringRuleDto
        {
            Description = $"{debt.Title} taksiti",
            Type = txType,
            Nature = TransactionNature.Fixed,
            CategoryId = categoryId.Value,
            Amount = perInstallment,
            Currency = debt.Currency,
            Frequency = MapToRecurringFrequency(frequency),
            StartDate = debt.StartDate,
            EndDate = endDate,
            AutoApprove = true,
            Notes = $"Otomatik plan — Debt #{debt.Id}",
            HouseholdId = debt.HouseholdId,
        };

        var resp = await recurringRuleService.CreateAsync(userId, createDto, cancellationToken);
        if (!resp.IsSuccess || resp.Data is null)
            return (null, resp.Message ?? "Tekrarlayan kural oluşturulamadı.");

        return (resp.Data, null);
    }

    private static DateTime AddFrequencyTimes(DateTime from, DebtFrequency frequency, int times)
    {
        var result = from;
        for (var i = 0; i < times; i++)
            result = AddFrequency(result, frequency);
        return result;
    }

    /// <summary>
    /// Borç ödemesi için kategori çözümlemesi: önce sistem "Borç Ödeme" kategorisi (ve tipi
    /// eşleşiyorsa) — yoksa scope'a uygun ilk kategoriden ilki. Receivable için (Income)
    /// "Borç Ödeme" Expense olarak seed edildiğinden tip uyumsuzluğunda null döner ve
    /// linked tx atlanır.
    /// </summary>
    private async Task<int?> ResolveDebtCategoryIdAsync(int userId, int? householdId, TransactionType type, CancellationToken cancellationToken)
    {
        // 1) Sistem kategorisi (UserId=NULL, IsSystem=true), tipi uyuyorsa.
        var systemId = await context.Categories
            .AsNoTracking()
            .Where(c => c.IsSystem
                     && c.UserId == null
                     && c.Name == SystemDebtCategoryName
                     && c.Type == type)
            .Select(c => (int?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (systemId.HasValue) return systemId;

        // 2) Scope içinde aynı tipten erişilebilir ilk kategori.
        var fallback = householdId.HasValue
            ? await context.Categories.AsNoTracking()
                .Where(c => c.Type == type
                         && (c.HouseholdId == householdId.Value || (c.IsSystem && c.UserId == null)))
                .OrderByDescending(c => c.IsSystem)
                .ThenBy(c => c.Name)
                .Select(c => (int?)c.Id)
                .FirstOrDefaultAsync(cancellationToken)
            : await context.Categories.AsNoTracking()
                .Where(c => c.Type == type
                         && ((c.UserId == userId && c.HouseholdId == null) || (c.IsSystem && c.UserId == null)))
                .OrderByDescending(c => c.IsSystem)
                .ThenBy(c => c.Name)
                .Select(c => (int?)c.Id)
                .FirstOrDefaultAsync(cancellationToken);

        return fallback;
    }
}
