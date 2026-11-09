using MediatR;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Queries.GetMonthlyInsights;

public sealed class GetMonthlyInsightsQueryHandler(IAiAssistService service)
    : IRequestHandler<GetMonthlyInsightsQuery, ApiResponse<MonthlyInsightsDto>>
{
    public Task<ApiResponse<MonthlyInsightsDto>> Handle(GetMonthlyInsightsQuery request, CancellationToken cancellationToken)
        => service.GetMonthlyInsightsAsync(request.UserId, request.Month, request.Year, request.Language, cancellationToken);
}
