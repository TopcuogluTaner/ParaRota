using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.MarkAllNotificationsRead;

public sealed record MarkAllNotificationsReadCommand(int UserId) : IRequest<ApiResponse<string>>;
