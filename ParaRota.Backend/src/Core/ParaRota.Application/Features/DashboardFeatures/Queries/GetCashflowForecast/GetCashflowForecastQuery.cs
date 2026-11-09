using MediatR;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DashboardFeatures.Queries.GetCashflowForecast;

public sealed record GetCashflowForecastQuery(int UserId)
    : IRequest<ApiResponse<CashflowForecastDto>>;
