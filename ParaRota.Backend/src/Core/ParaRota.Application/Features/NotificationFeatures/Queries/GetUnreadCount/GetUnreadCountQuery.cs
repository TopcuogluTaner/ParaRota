using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Queries.GetUnreadCount;

public sealed record GetUnreadCountQuery(int UserId) : IRequest<ApiResponse<int>>;
