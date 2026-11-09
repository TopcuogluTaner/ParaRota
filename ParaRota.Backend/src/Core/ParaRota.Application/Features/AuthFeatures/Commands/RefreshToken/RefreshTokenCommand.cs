using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.RefreshToken;

public sealed record RefreshTokenCommand(RefreshTokenDto Dto, string? IpAddress) : IRequest<ApiResponse<AuthResponseDto>>;
