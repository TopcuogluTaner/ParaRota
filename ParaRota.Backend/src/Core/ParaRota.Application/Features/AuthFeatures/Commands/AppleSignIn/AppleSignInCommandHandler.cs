using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.AppleSignIn;

public sealed class AppleSignInCommandHandler(IAuthService authService)
    : IRequestHandler<AppleSignInCommand, ApiResponse<AuthResponseDto>>
{
    public Task<ApiResponse<AuthResponseDto>> Handle(AppleSignInCommand request, CancellationToken cancellationToken)
        => authService.AppleSignInAsync(request.Dto, request.IpAddress, cancellationToken);
}
