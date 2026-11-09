using MediatR;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.AcceptInvite;

public sealed record AcceptInviteCommand(int UserId, AcceptInviteDto Dto) : IRequest<ApiResponse<AcceptInviteResultDto>>;
