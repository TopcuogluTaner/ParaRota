using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ResetPassword;

public sealed record ResetPasswordCommand(ResetPasswordDto Dto) : IRequest<ApiResponse<string>>;
