using MediatR;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionText;

public sealed class ParseTransactionTextCommandHandler(IAiAssistService service)
    : IRequestHandler<ParseTransactionTextCommand, ApiResponse<ParsedTransactionDto>>
{
    public Task<ApiResponse<ParsedTransactionDto>> Handle(ParseTransactionTextCommand request, CancellationToken cancellationToken)
        => service.ParseTransactionAsync(request.UserId, request.Text, request.Language, cancellationToken);
}
