using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.ResendInvite;

public sealed record ResendInviteCommand(int UserId, int HouseholdId, int InviteId) : IRequest<ApiResponse<HouseholdInviteDto>>;
