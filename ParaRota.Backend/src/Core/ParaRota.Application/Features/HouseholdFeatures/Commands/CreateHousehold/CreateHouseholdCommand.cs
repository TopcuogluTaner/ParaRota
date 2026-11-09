using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.CreateHousehold;

public sealed record CreateHouseholdCommand(int UserId, CreateHouseholdDto Dto) : IRequest<ApiResponse<HouseholdDto>>;
