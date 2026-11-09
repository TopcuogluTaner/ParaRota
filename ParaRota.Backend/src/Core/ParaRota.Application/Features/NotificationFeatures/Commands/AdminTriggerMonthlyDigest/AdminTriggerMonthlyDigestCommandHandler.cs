using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.AdminTriggerMonthlyDigest;

public sealed class AdminTriggerMonthlyDigestCommandHandler(IMonthlyDigestService service)
    : IRequestHandler<AdminTriggerMonthlyDigestCommand, ApiResponse<int>>
{
    public async Task<ApiResponse<int>> Handle(AdminTriggerMonthlyDigestCommand request, CancellationToken cancellationToken)
    {
        var sent = await service.SendMonthlyDigestsAsync(cancellationToken);
        return ApiResponse<int>.Success(sent, $"{sent} karne gönderildi.");
    }
}
