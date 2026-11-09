using MediatR;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.BudgetFeatures.Queries.GetBudgetById;

public sealed record GetBudgetByIdQuery(int UserId, int Id) : IRequest<ApiResponse<BudgetDto>>;
