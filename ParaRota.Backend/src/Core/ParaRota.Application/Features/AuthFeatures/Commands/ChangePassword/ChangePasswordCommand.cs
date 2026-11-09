using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.ChangePassword;

public sealed record ChangePasswordCommand(int UserId, ChangePasswordDto Dto) : IRequest<ApiResponse<string>>;
