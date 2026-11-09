using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.VerifyEmail;

public sealed class VerifyEmailCommandHandler(IAuthService authService)
    : IRequestHandler<VerifyEmailCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
        => authService.VerifyEmailAsync(request.Dto, cancellationToken);
}
