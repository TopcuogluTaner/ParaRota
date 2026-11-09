using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.CreateCategory;

public sealed class CreateCategoryCommandHandler(ICategoryService categoryService)
    : IRequestHandler<CreateCategoryCommand, ApiResponse<CategoryDto>>
{
    public Task<ApiResponse<CategoryDto>> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
        => categoryService.CreateAsync(request.UserId, request.Dto, cancellationToken);
}
