using MediatR;
using ParaRota.Application.DTOs.Dashboard;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.DashboardFeatures.Queries.GetCashflowForecast;

// Forecast, kural semantiğine (maaş/taksit tutar hesabı, NextRunDate ilerletme)
// dayandığı için IRecurringRuleService'te yaşar; dashboard yalnız sunum yüzeyi.
public sealed class GetCashflowForecastQueryHandler(IRecurringRuleService service)
    : IRequestHandler<GetCashflowForecastQuery, ApiResponse<CashflowForecastDto>>
{
    public Task<ApiResponse<CashflowForecastDto>> Handle(GetCashflowForecastQuery request, CancellationToken cancellationToken)
        => service.GetCashflowForecastAsync(request.UserId, cancellationToken);
}
