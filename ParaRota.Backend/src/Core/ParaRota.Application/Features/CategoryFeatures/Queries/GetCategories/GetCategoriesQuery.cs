using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.CategoryFeatures.Queries.GetCategories;

public sealed record GetCategoriesQuery(int UserId, TransactionType? Type)
    : IRequest<ApiResponse<IReadOnlyList<CategoryDto>>>;
