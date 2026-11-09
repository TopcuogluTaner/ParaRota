using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface ITransactionService
{
    Task<ApiResponse<PagedResponse<TransactionDto>>> GetAllAsync(int userId, TransactionListParams query, CancellationToken cancellationToken = default);
    Task<ApiResponse<TransactionDto>> GetByIdAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<TransactionDto>> CreateAsync(int userId, CreateTransactionDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<TransactionDto>> UpdateAsync(int userId, int id, UpdateTransactionDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);
    Task<ApiResponse<TransactionDto>> MoveScopeAsync(int userId, int id, MoveTransactionScopeDto dto, CancellationToken cancellationToken = default);
}
