using MediatR;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AiFeatures.Queries.GetMonthlyInsights;

public sealed record GetMonthlyInsightsQuery(int UserId, int Month, int Year, string? Language)
    : IRequest<ApiResponse<MonthlyInsightsDto>>;
