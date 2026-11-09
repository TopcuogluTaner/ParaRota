using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateMemberRole;

public sealed record UpdateMemberRoleCommand(int UserId, int HouseholdId, int MemberUserId, UpdateMemberRoleDto Dto) : IRequest<ApiResponse<string>>;
