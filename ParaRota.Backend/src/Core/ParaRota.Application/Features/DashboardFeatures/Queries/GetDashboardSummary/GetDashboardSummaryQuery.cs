using MediatR;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DashboardFeatures.Queries.GetDashboardSummary;

public sealed record GetDashboardSummaryQuery(int UserId, int? Month, int? Year)
    : IRequest<ApiResponse<DashboardSummaryDto>>;
