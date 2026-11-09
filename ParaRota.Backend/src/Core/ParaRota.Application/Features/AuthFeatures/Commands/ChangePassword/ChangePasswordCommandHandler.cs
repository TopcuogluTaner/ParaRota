using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ChangePassword;

public sealed class ChangePasswordCommandHandler(IAuthService authService)
    : IRequestHandler<ChangePasswordCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
        => authService.ChangePasswordAsync(request.UserId, request.Dto, cancellationToken);
}
