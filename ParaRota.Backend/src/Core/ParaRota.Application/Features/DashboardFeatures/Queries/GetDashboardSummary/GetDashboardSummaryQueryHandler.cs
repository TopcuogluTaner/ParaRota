using MediatR;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DashboardFeatures.Queries.GetDashboardSummary;

public sealed class GetDashboardSummaryQueryHandler(IDashboardService dashboardService)
    : IRequestHandler<GetDashboardSummaryQuery, ApiResponse<DashboardSummaryDto>>
{
    public Task<ApiResponse<DashboardSummaryDto>> Handle(GetDashboardSummaryQuery request, CancellationToken cancellationToken)
        => dashboardService.GetSummaryAsync(request.UserId, request.Month, request.Year, cancellationToken);
}
