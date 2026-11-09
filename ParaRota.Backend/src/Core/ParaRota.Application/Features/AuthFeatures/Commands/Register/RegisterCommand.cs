using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.Register;

public sealed record RegisterCommand(RegisterDto Dto) : IRequest<ApiResponse<string>>;
