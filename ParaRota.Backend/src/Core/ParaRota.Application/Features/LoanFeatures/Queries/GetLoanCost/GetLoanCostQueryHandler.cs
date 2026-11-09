using MediatR;
using ParaRota.Application.DTOs.Loan;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.LoanFeatures.Queries.GetLoanCost;

public sealed class GetLoanCostQueryHandler(ILoanCostService service)
    : IRequestHandler<GetLoanCostQuery, ApiResponse<LoanCostResultDto>>
{
    public Task<ApiResponse<LoanCostResultDto>> Handle(GetLoanCostQuery request, CancellationToken cancellationToken)
    {
        var result = service.Calculate(
            request.Amount, request.MonthlyRatePercent, request.TermMonths, request.LoanType!.Value, request.DosyaMasrafi);
        return Task.FromResult(ApiResponse<LoanCostResultDto>.Success(result));
    }
}
