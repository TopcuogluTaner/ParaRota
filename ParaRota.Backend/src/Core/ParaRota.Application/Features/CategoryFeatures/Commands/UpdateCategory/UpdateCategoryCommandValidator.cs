using FluentValidation;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.UpdateCategory;

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);

        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Kategori adı boş olamaz.")
            .MaximumLength(100);

        RuleFor(x => x.Dto.Icon)
            .NotEmpty().WithMessage("İkon zorunlu.")
            .MaximumLength(80);

        RuleFor(x => x.Dto.Emoji)
            .MaximumLength(16).When(x => !string.IsNullOrEmpty(x.Dto.Emoji));

        RuleFor(x => x.Dto.Color)
            .Matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$").When(x => !string.IsNullOrEmpty(x.Dto.Color))
            .WithMessage("Renk geçerli bir hex kodu olmalı (#RRGGBB).");
    }
}
