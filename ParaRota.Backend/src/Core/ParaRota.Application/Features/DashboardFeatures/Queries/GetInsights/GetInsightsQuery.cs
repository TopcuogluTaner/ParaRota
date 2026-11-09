using MediatR;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DashboardFeatures.Queries.GetInsights;

public sealed record GetInsightsQuery(int UserId)
    : IRequest<ApiResponse<IReadOnlyList<InsightDto>>>;
