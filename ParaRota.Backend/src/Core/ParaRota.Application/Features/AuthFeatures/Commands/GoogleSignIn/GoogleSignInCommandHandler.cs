using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.GoogleSignIn;

public sealed class GoogleSignInCommandHandler(IAuthService authService)
    : IRequestHandler<GoogleSignInCommand, ApiResponse<AuthResponseDto>>
{
    public Task<ApiResponse<AuthResponseDto>> Handle(GoogleSignInCommand request, CancellationToken cancellationToken)
        => authService.GoogleSignInAsync(request.Dto, request.IpAddress, cancellationToken);
}
