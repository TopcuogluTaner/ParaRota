using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Commands.TranscribeVoice;

public sealed class TranscribeVoiceCommandHandler(IAiAssistService service)
    : IRequestHandler<TranscribeVoiceCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(TranscribeVoiceCommand request, CancellationToken cancellationToken)
        => service.TranscribeAsync(request.Audio, request.MimeType, cancellationToken);
}
