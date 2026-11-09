using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.GoogleSignIn;

public sealed record GoogleSignInCommand(GoogleSignInDto Dto, string? IpAddress) : IRequest<ApiResponse<AuthResponseDto>>;
