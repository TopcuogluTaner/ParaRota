using FluentValidation;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.DeleteCategory;

public sealed class DeleteCategoryCommandValidator : AbstractValidator<DeleteCategoryCommand>
{
    public DeleteCategoryCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
    }
}
