using Hangfire;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface IRecurringRuleService
{
    Task<ApiResponse<IReadOnlyList<RecurringRuleDto>>> GetAllAsync(int userId, bool? isActive, CancellationToken cancellationToken = default);

    // Abonelik Radarı: sistem "Abonelikler" kategorisindeki gider kuralları (maaş/taksit hariç)
    // için maliyet özeti + üretilmiş işlemlerden zam tespiti. Aktif scope'a göre çalışır.
    Task<ApiResponse<SubscriptionRadarDto>> GetSubscriptionRadarAsync(int userId, CancellationToken cancellationToken = default);

    // Nakit akışı tahmini: bu ayın gerçekleşeni + bugünden ay sonuna tekrarlayan kural
    // projeksiyonu (maaş gerçek netiyle, taksit son-ay küsuratıyla). Rule semantiği bu
    // serviste yaşadığı için forecast da burada (DashboardController üzerinden sunulur).
    Task<ApiResponse<ParaRota.Application.DTOs.Dashboard.CashflowForecastDto>> GetCashflowForecastAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<RecurringRuleDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<RecurringRuleDto>> CreateAsync(int userId, CreateRecurringRuleDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<RecurringRuleDto>> UpdateAsync(int userId, int id, UpdateRecurringRuleDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    // Frequency'e göre verilen tarihten sonraki NextRunDate'i hesaplar.
    DateTime ComputeNextRunDate(DateTime from, RecurringFrequency frequency);

    // BackgroundService tarafından günde 1 kez çağrılır.
    // IsActive && NextRunDate <= NOW && (EndDate IS NULL || EndDate >= NOW) olan kuralları işler;
    // her biri için Transaction üretir ve NextRunDate'i ilerlet.
    // Returns: işlenen kural sayısı + üretilen transaction sayısı.
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<(int RulesProcessed, int TransactionsCreated)> RunDueAsync(CancellationToken cancellationToken = default);

    // Manuel "şimdi çalıştır" — sadece tek kural için. Kullanıcının yetkisi varsa
    // ve NextRunDate <= NOW ise RunDueAsync mantığını tetikler.
    Task<ApiResponse<int>> RunOnceAsync(int userId, int ruleId, CancellationToken cancellationToken = default);

    // Maaş otomatiğine zam uygular: yürürlük ay/yılından itibaren yeni brüt geçerli olur
    // (geçmişe eklenir; üretilecek işlemler doğru kümülatif vergiyle yeni brütten hesaplanır).
    Task<ApiResponse<RecurringRuleDto>> ApplyPayrollRaiseAsync(int userId, int ruleId, decimal gross, DateTime effectiveDate, CancellationToken cancellationToken = default);

    // Verilen kurala bağlı auto borcu, kuralın halihazırda üretilmiş ama henüz ödemeye
    // bağlanmamış taksit işlemlerine göre senkronlar (kalanı düş, son taksitte kapat, bitince
    // Completed). DebtService auto borç oluşturduktan SONRA çağırır: immediate-execute
    // taksitleri debt link'lenmeden üretmiş olabilir; bu çağrı geçmiş-tarihli borçların da
    // stuck kalmasını önler. İdempotenttir (TransactionId dedup).
    Task ReconcileLinkedDebtAsync(int ruleId, CancellationToken cancellationToken = default);
}
