using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateHousehold;

public sealed record UpdateHouseholdCommand(int UserId, int HouseholdId, UpdateHouseholdDto Dto) : IRequest<ApiResponse<HouseholdDto>>;
