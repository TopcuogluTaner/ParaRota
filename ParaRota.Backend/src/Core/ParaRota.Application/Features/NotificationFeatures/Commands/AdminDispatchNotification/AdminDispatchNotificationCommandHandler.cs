using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Identity;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.AdminDispatchNotification;

public sealed class AdminDispatchNotificationCommandHandler(
    UserManager<AppUser> userManager,
    INotificationDispatcher dispatcher)
    : IRequestHandler<AdminDispatchNotificationCommand, ApiResponse<int>>
{
    public async Task<ApiResponse<int>> Handle(AdminDispatchNotificationCommand request, CancellationToken cancellationToken)
    {
        var b = request.Body;

        // 1) Hedef kullanıcı listesini topla. UserManager.Users IQueryable
        //    döner ama Application katmanı EF Core'a depend etmediği için
        //    sync materialize ediyoruz (kullanıcı sayısı düşük varsayımı).
        List<int> targetUserIds;

        if (b.TargetUserId.HasValue)
        {
            var exists = userManager.Users.Any(u => u.Id == b.TargetUserId.Value);
            if (!exists)
                return ApiResponse<int>.Fail("Hedef kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.TargetUserNotFound);

            targetUserIds = new List<int> { b.TargetUserId.Value };
        }
        else if (!string.IsNullOrEmpty(b.TargetRole))
        {
            var usersInRole = await userManager.GetUsersInRoleAsync(b.TargetRole);
            targetUserIds = usersInRole.Select(u => u.Id).ToList();
        }
        else
        {
            // Broadcast — tüm aktif kullanıcılar
            targetUserIds = userManager.Users.Select(u => u.Id).ToList();
        }

        if (targetUserIds.Count == 0)
            return ApiResponse<int>.Fail("Hedef kitle boş.", 400, errorCode: ErrorCodes.TargetAudienceEmpty);

        // 2) Payload (Url + raw flag)
        var payload = JsonSerializer.Serialize(new
        {
            url = b.Url,
            raw = true, // frontend "raw text" olarak gösterir, i18n key arama
        });

        // 3) Her kullanıcı için DispatchAsync — dedup yok (admin her tetiklemede
        //    yeni bildirim atabilsin). PushTitle/PushBody zaten interpolated.
        foreach (var uid in targetUserIds)
        {
            var envelope = new NotificationEnvelope(
                UserId: uid,
                Type: NotificationType.System,
                Severity: b.Severity,
                TitleKey: b.Title,    // raw text, i18next bulamayınca aynısını basar
                MessageKey: b.Message,
                Payload: payload,
                RefType: null,
                RefId: null,
                DedupKey: null,
                PushTitle: b.Title,
                PushBody: b.Message);

            await dispatcher.DispatchAsync(envelope, cancellationToken);
        }

        return ApiResponse<int>.Success(
            targetUserIds.Count,
            $"{targetUserIds.Count} kullanıcıya bildirim gönderildi.");
    }
}
