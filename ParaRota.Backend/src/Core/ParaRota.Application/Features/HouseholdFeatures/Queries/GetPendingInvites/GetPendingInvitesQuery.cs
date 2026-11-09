using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetPendingInvites;

public sealed record GetPendingInvitesQuery(int UserId, int HouseholdId) : IRequest<ApiResponse<IReadOnlyList<HouseholdInviteDto>>>;
