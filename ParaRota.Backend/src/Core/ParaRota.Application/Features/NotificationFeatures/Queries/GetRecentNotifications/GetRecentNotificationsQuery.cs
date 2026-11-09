using MediatR;
using ParaRota.Application.DTOs.Notifications;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Queries.GetRecentNotifications;

public sealed record GetRecentNotificationsQuery(int UserId, int Take) : IRequest<ApiResponse<IReadOnlyList<NotificationDto>>>;
