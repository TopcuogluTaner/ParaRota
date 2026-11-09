using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.RefreshToken;

public sealed class RefreshTokenCommandHandler(IAuthService authService)
    : IRequestHandler<RefreshTokenCommand, ApiResponse<AuthResponseDto>>
{
    public Task<ApiResponse<AuthResponseDto>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        => authService.RefreshTokenAsync(request.Dto, request.IpAddress, cancellationToken);
}
