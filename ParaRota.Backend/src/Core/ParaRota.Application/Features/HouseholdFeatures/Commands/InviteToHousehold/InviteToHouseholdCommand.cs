using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.InviteToHousehold;

public sealed record InviteToHouseholdCommand(int UserId, int HouseholdId, InviteToHouseholdDto Dto) : IRequest<ApiResponse<HouseholdInviteDto>>;
