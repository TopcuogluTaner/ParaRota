using FluentValidation;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.MergeCategory;

public sealed class MergeCategoryCommandValidator : AbstractValidator<MergeCategoryCommand>
{
    public MergeCategoryCommandValidator()
    {
        RuleFor(x => x.SourceId).GreaterThan(0);
        RuleFor(x => x.Dto.TargetCategoryId).GreaterThan(0);
        RuleFor(x => x.Dto.TargetCategoryId)
            .NotEqual(x => x.SourceId)
            .WithMessage("Kategori kendisiyle birleştirilemez.");
    }
}
