using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Queries.GetCategories;

public sealed class GetCategoriesQueryHandler(ICategoryService categoryService)
    : IRequestHandler<GetCategoriesQuery, ApiResponse<IReadOnlyList<CategoryDto>>>
{
    public Task<ApiResponse<IReadOnlyList<CategoryDto>>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
        => categoryService.GetAllAsync(request.UserId, request.Type, cancellationToken);
}
