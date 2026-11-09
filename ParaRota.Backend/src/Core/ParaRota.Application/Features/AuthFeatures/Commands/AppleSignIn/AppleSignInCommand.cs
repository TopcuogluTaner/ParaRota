using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.AppleSignIn;

public sealed record AppleSignInCommand(AppleSignInDto Dto, string? IpAddress) : IRequest<ApiResponse<AuthResponseDto>>;
