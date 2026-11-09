using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.RemoveMember;

public sealed record RemoveMemberCommand(int UserId, int HouseholdId, int MemberUserId) : IRequest<ApiResponse<string>>;
