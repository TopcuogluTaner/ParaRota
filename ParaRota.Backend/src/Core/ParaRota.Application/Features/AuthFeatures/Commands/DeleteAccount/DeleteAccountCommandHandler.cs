using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.DeleteAccount;

public sealed class DeleteAccountCommandHandler(IAuthService authService)
    : IRequestHandler<DeleteAccountCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
        => authService.DeleteAccountAsync(request.UserId, cancellationToken);
}
