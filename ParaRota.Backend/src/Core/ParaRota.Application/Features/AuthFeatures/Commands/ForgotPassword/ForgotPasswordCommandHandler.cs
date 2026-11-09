using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ForgotPassword;

public sealed class ForgotPasswordCommandHandler(IAuthService authService)
    : IRequestHandler<ForgotPasswordCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        => authService.ForgotPasswordAsync(request.Dto, cancellationToken);
}
