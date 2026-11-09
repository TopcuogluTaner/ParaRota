using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.DeleteCategory;

public sealed class DeleteCategoryCommandHandler(ICategoryService categoryService)
    : IRequestHandler<DeleteCategoryCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
        => categoryService.DeleteAsync(request.UserId, request.Id, cancellationToken);
}
