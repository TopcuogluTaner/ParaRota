using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ForgotPassword;

public sealed record ForgotPasswordCommand(ForgotPasswordDto Dto) : IRequest<ApiResponse<string>>;
