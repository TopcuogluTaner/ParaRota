using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.VerifyEmail;

public sealed record VerifyEmailCommand(VerifyEmailDto Dto) : IRequest<ApiResponse<string>>;
