using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyMemberships;

/// <summary>Üyelik listesi — premium'dan bağımsız (ayrılma akışının keşfi için).</summary>
public sealed record GetMyMembershipsQuery(int UserId) : IRequest<ApiResponse<IReadOnlyList<HouseholdDto>>>;
