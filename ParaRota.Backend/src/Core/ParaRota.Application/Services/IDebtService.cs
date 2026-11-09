using Hangfire;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface IDebtService
{
    Task<ApiResponse<IReadOnlyList<DebtListItemDto>>> GetMyDebtsAsync(int userId, DebtStatus? status, CancellationToken cancellationToken = default);
    Task<ApiResponse<DebtDto>> GetByIdAsync(int userId, int debtId, CancellationToken cancellationToken = default);
    Task<ApiResponse<DebtDto>> CreateAsync(int userId, CreateDebtDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<DebtDto>> UpdateAsync(int userId, int debtId, UpdateDebtDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int debtId, CancellationToken cancellationToken = default);
    Task<ApiResponse<DebtDto>> AddPaymentAsync(int userId, int debtId, AddDebtPaymentDto dto, CancellationToken cancellationToken = default);

    // Hangfire — günlük "vadesi yaklaşan" hatırlatmaları gönderir; gönderilen bildirim sayısını döner.
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> SendDuePaymentRemindersAsync(CancellationToken cancellationToken = default);
}
