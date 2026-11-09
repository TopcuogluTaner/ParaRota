using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ResendVerificationCode;

public sealed class ResendVerificationCodeCommandHandler(IAuthService authService)
    : IRequestHandler<ResendVerificationCodeCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(ResendVerificationCodeCommand request, CancellationToken cancellationToken)
        => authService.ResendVerificationCodeAsync(request.Dto, cancellationToken);
}
