using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.CancelInvite;

public sealed record CancelInviteCommand(int UserId, int HouseholdId, int InviteId) : IRequest<ApiResponse<string>>;
