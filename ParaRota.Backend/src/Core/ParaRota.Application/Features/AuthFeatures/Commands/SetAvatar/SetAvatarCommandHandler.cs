using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetAvatar;

public sealed class SetAvatarCommandHandler(IAuthService authService)
    : IRequestHandler<SetAvatarCommand, ApiResponse<string?>>
{
    public Task<ApiResponse<string?>> Handle(SetAvatarCommand request, CancellationToken cancellationToken)
        => authService.SetAvatarAsync(request.UserId, request.Avatar, cancellationToken);
}
