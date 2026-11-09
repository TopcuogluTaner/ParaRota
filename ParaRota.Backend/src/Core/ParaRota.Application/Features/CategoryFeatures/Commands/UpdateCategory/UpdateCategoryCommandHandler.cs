using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.UpdateCategory;

public sealed class UpdateCategoryCommandHandler(ICategoryService categoryService)
    : IRequestHandler<UpdateCategoryCommand, ApiResponse<CategoryDto>>
{
    public Task<ApiResponse<CategoryDto>> Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
        => categoryService.UpdateAsync(request.UserId, request.Id, request.Dto, cancellationToken);
}
