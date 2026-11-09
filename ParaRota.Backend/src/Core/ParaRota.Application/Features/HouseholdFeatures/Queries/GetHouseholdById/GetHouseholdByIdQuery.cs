using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetHouseholdById;

public sealed record GetHouseholdByIdQuery(int UserId, int HouseholdId) : IRequest<ApiResponse<HouseholdDto>>;
