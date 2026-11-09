using FluentValidation;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.CreateCategory;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Kategori adı boş olamaz.")
            .MaximumLength(100).WithMessage("Kategori adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Dto.Icon)
            .NotEmpty().WithMessage("İkon zorunlu.")
            .MaximumLength(80);

        RuleFor(x => x.Dto.Emoji)
            .MaximumLength(16).When(x => !string.IsNullOrEmpty(x.Dto.Emoji));

        RuleFor(x => x.Dto.Color)
            .Matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$").When(x => !string.IsNullOrEmpty(x.Dto.Color))
            .WithMessage("Renk geçerli bir hex kodu olmalı (#RRGGBB).");

        RuleFor(x => x.Dto.Type)
            .IsInEnum().WithMessage("Geçersiz kategori türü.")
            .Must(t => t == TransactionType.Income || t == TransactionType.Expense)
            .WithMessage("Tür Income veya Expense olmalı.");
    }
}
