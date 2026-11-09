using MediatR;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RecurringRuleFeatures.Commands.ApplyPayrollRaise;

/// <summary>
/// Maaş otomatiğine zam uygular — yürürlük ay/yılından itibaren yeni brüt geçerli olur.
/// </summary>
public sealed record ApplyPayrollRaiseCommand(int UserId, int RuleId, PayrollRaiseDto Dto)
    : IRequest<ApiResponse<RecurringRuleDto>>;
