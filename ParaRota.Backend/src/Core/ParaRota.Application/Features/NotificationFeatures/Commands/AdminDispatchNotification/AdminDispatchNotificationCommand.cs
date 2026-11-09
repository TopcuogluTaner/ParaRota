using MediatR;
using ParaRota.Application.DTOs.Notifications;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.AdminDispatchNotification;

/// <summary>
/// [Admin only] Manuel bildirim gönderir. Tek kullanıcı, tek role veya tüm
/// kullanıcılara (broadcast). Mevcut INotificationDispatcher kullanılır —
/// hedef listedeki her kullanıcı için tek tek DispatchAsync (DB + SignalR + FCM).
/// </summary>
public sealed record AdminDispatchNotificationCommand(AdminDispatchNotificationDto Body)
    : IRequest<ApiResponse<int>>;
