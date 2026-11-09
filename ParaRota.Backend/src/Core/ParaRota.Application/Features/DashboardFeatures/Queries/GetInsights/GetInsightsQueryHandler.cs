using MediatR;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DashboardFeatures.Queries.GetInsights;

public sealed class GetInsightsQueryHandler(IDashboardService service)
    : IRequestHandler<GetInsightsQuery, ApiResponse<IReadOnlyList<InsightDto>>>
{
    public Task<ApiResponse<IReadOnlyList<InsightDto>>> Handle(GetInsightsQuery request, CancellationToken cancellationToken)
        => service.GetInsightsAsync(request.UserId, cancellationToken);
}
