using MediatR;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionVoice;

public sealed record ParseTransactionVoiceCommand(int UserId, byte[] Audio, string MimeType, string? Language)
    : IRequest<ApiResponse<ParsedTransactionDto>>;
