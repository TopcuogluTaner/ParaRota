using MediatR;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionVoice;

public sealed class ParseTransactionVoiceCommandHandler(IAiAssistService service)
    : IRequestHandler<ParseTransactionVoiceCommand, ApiResponse<ParsedTransactionDto>>
{
    public Task<ApiResponse<ParsedTransactionDto>> Handle(ParseTransactionVoiceCommand request, CancellationToken cancellationToken)
        => service.ParseTransactionFromAudioAsync(request.UserId, request.Audio, request.MimeType, request.Language, cancellationToken);
}
