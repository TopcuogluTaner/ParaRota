using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.SystemLogs;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class SystemLogService(AppDbContext context) : ISystemLogService
{
    private const int MaxPageSize = 100;

    public async Task<ApiResponse<PagedResponse<ErrorLogDto>>> GetErrorLogsAsync(SystemLogListParams query, CancellationToken cancellationToken = default)
    {
        var page = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize is < 1 or > MaxPageSize ? 20 : query.PageSize;

        var q = context.ErrorLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            q = q.Where(x => EF.Functions.ILike(x.Message, $"%{term}%")
                          || (x.RequestPath != null && EF.Functions.ILike(x.RequestPath, $"%{term}%")));
        }

        if (query.MinStatusCode is int min)
            q = q.Where(x => x.StatusCode >= min);

        var total = await q.CountAsync(cancellationToken);

        var items = await q
            .OrderByDescending(x => x.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ErrorLogDto
            {
                Id = x.Id,
                CreatedDate = x.CreatedDate,
                StatusCode = x.StatusCode,
                Message = x.Message,
                Source = x.Source,
                RequestPath = x.RequestPath,
                RequestMethod = x.RequestMethod,
                UserId = x.UserId,
                StackTrace = x.StackTrace,
            })
            .ToListAsync(cancellationToken);

        var paged = new PagedResponse<ErrorLogDto>
        {
            Items = items,
            PageNumber = page,
            PageSize = pageSize,
            TotalCount = total,
        };

        return ApiResponse<PagedResponse<ErrorLogDto>>.Success(paged);
    }

    public async Task<ApiResponse<int>> ClearAllAsync(CancellationToken cancellationToken = default)
    {
        // Loglar için kalıcı silme (soft-delete birikmesin) — ExecuteDelete global filtreyi atlar.
        var deleted = await context.ErrorLogs.ExecuteDeleteAsync(cancellationToken);
        return ApiResponse<int>.Success(deleted, "Sistem logları temizlendi.");
    }
}
