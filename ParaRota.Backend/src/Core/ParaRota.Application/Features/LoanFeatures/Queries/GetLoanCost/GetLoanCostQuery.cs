using MediatR;
using ParaRota.Application.DTOs.Loan;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.LoanFeatures.Queries.GetLoanCost;

/// <summary>
/// Kredi gerçek maliyeti: <paramref name="Amount"/> tutarlı, <paramref name="MonthlyRatePercent"/>
/// aylık faizli, <paramref name="TermMonths"/> vadeli kredinin faiz + KKDF + BSMV dahil maliyeti.
/// </summary>
public sealed record GetLoanCostQuery(
    decimal Amount, decimal MonthlyRatePercent, int TermMonths, LoanType? LoanType, decimal DosyaMasrafi)
    : IRequest<ApiResponse<LoanCostResultDto>>;
