using MediatR;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionText;

public sealed record ParseTransactionTextCommand(int UserId, string Text, string? Language)
    : IRequest<ApiResponse<ParsedTransactionDto>>;
