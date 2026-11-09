using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetOnboardingSeen;

public sealed class SetOnboardingSeenCommandHandler(IAuthService authService)
    : IRequestHandler<SetOnboardingSeenCommand, ApiResponse<int>>
{
    public Task<ApiResponse<int>> Handle(SetOnboardingSeenCommand request, CancellationToken cancellationToken)
        => authService.SetOnboardingSeenAsync(request.UserId, request.Version, request.Platform, cancellationToken);
}
