using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Queries.GetCategoryById;

public sealed class GetCategoryByIdQueryHandler(ICategoryService categoryService)
    : IRequestHandler<GetCategoryByIdQuery, ApiResponse<CategoryDto>>
{
    public Task<ApiResponse<CategoryDto>> Handle(GetCategoryByIdQuery request, CancellationToken cancellationToken)
        => categoryService.GetByIdAsync(request.UserId, request.Id, cancellationToken);
}
