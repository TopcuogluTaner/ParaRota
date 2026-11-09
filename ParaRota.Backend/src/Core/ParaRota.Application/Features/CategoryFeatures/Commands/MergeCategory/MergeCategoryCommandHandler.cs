using MediatR;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.MergeCategory;

public sealed class MergeCategoryCommandHandler(ICategoryService categoryService)
    : IRequestHandler<MergeCategoryCommand, ApiResponse<string>>
{
    public Task<ApiResponse<string>> Handle(MergeCategoryCommand request, CancellationToken cancellationToken)
        => categoryService.MergeAsync(request.UserId, request.SourceId, request.Dto.TargetCategoryId, cancellationToken);
}
