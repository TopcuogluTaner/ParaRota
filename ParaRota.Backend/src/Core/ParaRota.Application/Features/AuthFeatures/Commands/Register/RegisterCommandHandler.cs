using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.Register;

public sealed class RegisterCommandHandler(IAuthService authService)
    : IRequestHandler<RegisterCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        => authService.RegisterAsync(request.Dto, cancellationToken);
}
