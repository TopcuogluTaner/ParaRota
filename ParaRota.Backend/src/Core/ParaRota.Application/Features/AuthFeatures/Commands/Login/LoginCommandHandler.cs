using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.Login;

public sealed class LoginCommandHandler(IAuthService authService)
    : IRequestHandler<LoginCommand, ApiResponse<AuthResponseDto>>
{
    public Task<ApiResponse<AuthResponseDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
        => authService.LoginAsync(request.Dto, request.IpAddress, cancellationToken);
}
