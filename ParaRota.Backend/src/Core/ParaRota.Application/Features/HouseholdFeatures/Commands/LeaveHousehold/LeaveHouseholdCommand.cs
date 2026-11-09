using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.LeaveHousehold;

public sealed record LeaveHouseholdCommand(int UserId, int HouseholdId, LeaveHouseholdDto Dto) : IRequest<ApiResponse<string>>;
