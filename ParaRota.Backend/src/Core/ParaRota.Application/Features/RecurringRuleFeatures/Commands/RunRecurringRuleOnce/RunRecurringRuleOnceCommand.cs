using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.RunRecurringRuleOnce;

/// <summary>
/// Tek bir recurring rule için manuel "şimdi çalıştır". NextRunDate gelmişse
/// transaction(lar)ı üretir, Hangfire daily cron'unu beklemeden.
/// </summary>
public sealed record RunRecurringRuleOnceCommand(int UserId, int RuleId) : IRequest<ApiResponse<int>>;
