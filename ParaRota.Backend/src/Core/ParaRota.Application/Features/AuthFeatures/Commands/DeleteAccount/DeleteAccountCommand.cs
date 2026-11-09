using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.DeleteAccount;

public sealed record DeleteAccountCommand(int UserId) : IRequest<ApiResponse<string>>;
