using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Commands.TranscribeVoice;

public sealed record TranscribeVoiceCommand(byte[] Audio, string MimeType)
    : IRequest<ApiResponse<string>>;
