using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.MarkNotificationRead;

public sealed record MarkNotificationReadCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
