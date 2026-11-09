using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetOnboardingSeen;

public sealed record SetOnboardingSeenCommand(int UserId, int Version, string? Platform = null) : IRequest<ApiResponse<int>>;
