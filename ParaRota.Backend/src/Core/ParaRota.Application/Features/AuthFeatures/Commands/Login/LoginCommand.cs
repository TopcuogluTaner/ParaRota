using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.Login;

public sealed record LoginCommand(LoginDto Dto, string? IpAddress) : IRequest<ApiResponse<AuthResponseDto>>;
