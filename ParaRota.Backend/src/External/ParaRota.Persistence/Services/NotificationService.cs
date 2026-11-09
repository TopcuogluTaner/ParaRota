using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using ParaRota.Application.DTOs.Notifications;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class NotificationService(
    AppDbContext context,
    IMapper mapper,
    ILogger<NotificationService> logger) : INotificationService
{
    public async Task<ApiResponse<IReadOnlyList<NotificationDto>>> GetRecentAsync(int userId, int take = 20, CancellationToken cancellationToken = default)
    {
        var clamped = Math.Clamp(take, 1, 100);

        var items = await context.Notifications
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedDate)
            .Take(clamped)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(mapper.Map<NotificationDto>).ToList();
        return ApiResponse<IReadOnlyList<NotificationDto>>.Success(dtos);
    }

    public async Task<ApiResponse<int>> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default)
    {
        var count = await context.Notifications
            .AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsRead)
            .CountAsync(cancellationToken);

        return ApiResponse<int>.Success(count);
    }

    public async Task<ApiResponse<string>> MarkReadAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var entity = await context.Notifications
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Bildirim bulunamadı.", 404, errorCode: ErrorCodes.NotificationNotFound);

        if (!entity.IsRead)
        {
            entity.IsRead = true;
            entity.ReadAt = DateTime.Now;
            await context.SaveChangesAsync(cancellationToken);
        }

        return ApiResponse<string>.Success("", "Okundu olarak işaretlendi.");
    }

    public async Task<ApiResponse<string>> MarkAllReadAsync(int userId, CancellationToken cancellationToken = default)
    {
        var unread = await context.Notifications
            .Where(x => x.UserId == userId && !x.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count == 0)
            return ApiResponse<string>.Success("", "Okunmamış bildirim yok.");

        var now = DateTime.Now;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        await context.SaveChangesAsync(cancellationToken);
        return ApiResponse<string>.Success("", "Tüm bildirimler okundu olarak işaretlendi.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var entity = await context.Notifications
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Bildirim bulunamadı.", 404, errorCode: ErrorCodes.NotificationNotFound);

        context.Notifications.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Bildirim silindi.");
    }

    public async Task<bool> TryRaiseAsync(NotificationCreateInternal data, CancellationToken cancellationToken = default)
    {
        // DedupKey verilmişse, fast-path: önce aynı (UserId, DedupKey) var mı kontrol et.
        // Race olursa unique constraint (PostgresException 23505) bizi koruyor.
        if (!string.IsNullOrEmpty(data.DedupKey))
        {
            var exists = await context.Notifications
                .AsNoTracking()
                .AnyAsync(x => x.UserId == data.UserId && x.DedupKey == data.DedupKey, cancellationToken);

            if (exists)
            {
                logger.LogDebug("Notification skipped (dedup hit): user {UserId} key {Key}", data.UserId, data.DedupKey);
                return false;
            }
        }

        var entity = new Notification
        {
            UserId = data.UserId,
            Type = data.Type,
            Severity = data.Severity,
            TitleKey = data.TitleKey,
            MessageKey = data.MessageKey,
            Payload = data.Payload,
            RefType = data.RefType,
            RefId = data.RefId,
            DedupKey = data.DedupKey,
            IsRead = false,
        };

        try
        {
            await context.Notifications.AddAsync(entity, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Aynı (UserId, DedupKey) için zaten kayıt var — idempotent skip.
            logger.LogDebug(ex, "Notification dedup unique violation skipped: user {UserId} key {Key}", data.UserId, data.DedupKey);
            context.Entry(entity).State = EntityState.Detached;
            return false;
        }
        catch (Exception ex)
        {
            // TryRaiseAsync sözleşmesi: hata fırlatmaz — sadece logla.
            logger.LogError(ex, "Notification TryRaise failed for user {UserId} type {Type}", data.UserId, data.Type);
            return false;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
        // PostgreSQL SQLState 23505 = unique_violation. Strongly-typed (Npgsql.PostgresException);
        // önceki reflection tabanlı kontrol Npgsql tip ismi değişirse sessizce kırılırdı.
        => ex.InnerException is PostgresException pg && pg.SqlState == "23505";
}
