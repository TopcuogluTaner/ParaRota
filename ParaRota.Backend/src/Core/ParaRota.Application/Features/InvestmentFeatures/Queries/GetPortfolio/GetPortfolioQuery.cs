using MediatR;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InvestmentFeatures.Queries.GetPortfolio;

public sealed record GetPortfolioQuery(int UserId) : IRequest<ApiResponse<PortfolioDto>>;
