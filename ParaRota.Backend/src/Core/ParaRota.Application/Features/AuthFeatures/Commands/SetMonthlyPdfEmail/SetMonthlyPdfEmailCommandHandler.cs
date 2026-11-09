using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetMonthlyPdfEmail;

public sealed class SetMonthlyPdfEmailCommandHandler(IAuthService authService)
    : IRequestHandler<SetMonthlyPdfEmailCommand, ApiResponse<bool>>
{
    public Task<ApiResponse<bool>> Handle(SetMonthlyPdfEmailCommand request, CancellationToken cancellationToken)
        => authService.SetMonthlyPdfEmailAsync(request.UserId, request.Enabled, cancellationToken);
}
