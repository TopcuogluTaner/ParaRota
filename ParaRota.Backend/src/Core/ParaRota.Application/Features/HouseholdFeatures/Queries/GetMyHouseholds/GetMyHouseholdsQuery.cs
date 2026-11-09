using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyHouseholds;

public sealed record GetMyHouseholdsQuery(int UserId) : IRequest<ApiResponse<IReadOnlyList<HouseholdDto>>>;
