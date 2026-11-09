using FluentValidation;

namespace ParaRota.Application.Features.AiFeatures.Commands.ParseTransactionText;

public sealed class ParseTransactionTextCommandValidator : AbstractValidator<ParseTransactionTextCommand>
{
    public ParseTransactionTextCommandValidator()
    {
        RuleFor(x => x.Text).NotEmpty().MinimumLength(3).MaximumLength(280)
            .WithMessage("Metin 3-280 karakter olmalı.");
    }
}
