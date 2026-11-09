using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ResendVerificationCode;

public sealed record ResendVerificationCodeCommand(ResendVerificationCodeDto Dto) : IRequest<ApiResponse<string>>;
