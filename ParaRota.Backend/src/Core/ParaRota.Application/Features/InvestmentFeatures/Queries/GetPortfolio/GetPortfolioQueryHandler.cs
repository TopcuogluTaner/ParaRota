using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Queries.GetPortfolio;

public sealed class GetPortfolioQueryHandler(IInvestmentService service)
    : IRequestHandler<GetPortfolioQuery, ApiResponse<PortfolioDto>>
{
    public Task<ApiResponse<PortfolioDto>> Handle(GetPortfolioQuery request, CancellationToken cancellationToken)
        => service.GetPortfolioAsync(request.UserId, cancellationToken);
}
