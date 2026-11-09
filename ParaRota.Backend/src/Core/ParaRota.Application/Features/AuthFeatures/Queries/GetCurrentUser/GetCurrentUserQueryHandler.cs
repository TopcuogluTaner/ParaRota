using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Queries.GetCurrentUser;

public sealed class GetCurrentUserQueryHandler(IAuthService authService)
    : IRequestHandler<GetCurrentUserQuery, ApiResponse<UserDto>>
{
    public Task<ApiResponse<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
        => authService.GetCurrentUserAsync(request.UserId, cancellationToken);
}
