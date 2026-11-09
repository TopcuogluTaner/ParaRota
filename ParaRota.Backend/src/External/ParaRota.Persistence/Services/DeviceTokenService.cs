using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.DeviceTokens;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class DeviceTokenService(AppDbContext context) : IDeviceTokenService
{
    public async Task<ApiResponse<string>> RegisterAsync(int userId, RegisterDeviceTokenDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Token))
            return ApiResponse<string>.Fail("Token boş olamaz.", 400, errorCode: ErrorCodes.DeviceTokenEmpty);

        var token = dto.Token.Trim();
        if (token.Length > 512)
            return ApiResponse<string>.Fail("Token çok uzun (max 512).", 400, errorCode: ErrorCodes.DeviceTokenTooLong);

        var existing = await context.DeviceTokens
            .FirstOrDefaultAsync(x => x.Token == token, cancellationToken);

        var now = DateTime.Now;

        if (existing is null)
        {
            var entity = new DeviceToken
            {
                UserId = userId,
                Token = token,
                Platform = dto.Platform,
                IsActive = true,
                LastSeenAt = now,
            };
            await context.DeviceTokens.AddAsync(entity, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            return ApiResponse<string>.Success("", "Cihaz kaydedildi.", 201);
        }

        // Aynı token başka kullanıcıda ise: eskiyi revoke et, yenisini bağla.
        if (existing.UserId != userId)
        {
            // Aynı token farklı kullanıcıya gidecek — eski kaydı pasifle, yenisini ekle.
            existing.IsActive = false;
            existing.LastSeenAt = now;

            // Token unique olduğu için yeni satır eklemek yerine sahibini değiştir.
            existing.UserId = userId;
            existing.Platform = dto.Platform;
            existing.IsActive = true;
        }
        else
        {
            existing.Platform = dto.Platform;
            existing.IsActive = true;
        }

        existing.LastSeenAt = now;
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Cihaz güncellendi.");
    }

    public async Task<ApiResponse<string>> RevokeAsync(int userId, string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            return ApiResponse<string>.Fail("Token boş olamaz.", 400, errorCode: ErrorCodes.DeviceTokenEmpty);

        var entity = await context.DeviceTokens
            .FirstOrDefaultAsync(x => x.Token == token && x.UserId == userId, cancellationToken);

        if (entity is null)
            return ApiResponse<string>.Fail("Cihaz bulunamadı.", 404, errorCode: ErrorCodes.DeviceNotFound);

        entity.IsActive = false;
        entity.LastSeenAt = DateTime.Now;
        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("", "Cihaz iptal edildi.");
    }

    public async Task<IReadOnlyList<string>> GetActiveTokensAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await context.DeviceTokens
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => x.Token)
            .ToListAsync(cancellationToken);
    }

    public async Task DeactivateTokensAsync(IReadOnlyList<string> tokens, CancellationToken cancellationToken = default)
    {
        if (tokens.Count == 0) return;
        await context.DeviceTokens
            .Where(x => tokens.Contains(x.Token))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, false), cancellationToken);
    }
}
