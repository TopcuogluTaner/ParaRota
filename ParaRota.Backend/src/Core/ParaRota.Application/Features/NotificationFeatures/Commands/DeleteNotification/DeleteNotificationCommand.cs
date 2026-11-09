using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.DeleteNotification;

public sealed record DeleteNotificationCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
