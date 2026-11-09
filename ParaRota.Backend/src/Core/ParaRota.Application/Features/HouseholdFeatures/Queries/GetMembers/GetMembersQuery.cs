using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Queries.GetMembers;

public sealed record GetMembersQuery(int UserId, int HouseholdId) : IRequest<ApiResponse<IReadOnlyList<HouseholdMemberDto>>>;
