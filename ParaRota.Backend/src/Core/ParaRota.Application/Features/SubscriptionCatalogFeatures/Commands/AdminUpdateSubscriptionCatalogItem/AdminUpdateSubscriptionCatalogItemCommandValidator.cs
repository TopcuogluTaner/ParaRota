using FluentValidation;

namespace ParaRota.Application.Features.SubscriptionCatalogFeatures.Commands.AdminUpdateSubscriptionCatalogItem;

public sealed class AdminUpdateSubscriptionCatalogItemCommandValidator : AbstractValidator<AdminUpdateSubscriptionCatalogItemCommand>
{
    private static readonly string[] Frequencies = ["daily", "weekly", "monthly", "yearly"];

    public AdminUpdateSubscriptionCatalogItemCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Dto.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Dto.Icon).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Dto.Color).NotEmpty().MaximumLength(20).Matches("^#[0-9A-Fa-f]{6}$")
            .WithMessage("Renk #RRGGBB formatında olmalı.");
        RuleFor(x => x.Dto.SuggestedAmount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
        RuleFor(x => x.Dto.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(x => x.Dto.Frequency).Must(f => Frequencies.Contains(f))
            .WithMessage("Frekans daily/weekly/monthly/yearly olmalı.");
    }
}
