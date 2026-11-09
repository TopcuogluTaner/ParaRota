using FluentValidation;

namespace ParaRota.Application.Features.InflationFeatures.Queries.GetInflationConvert;

public sealed class GetInflationConvertQueryValidator : AbstractValidator<GetInflationConvertQuery>
{
    public GetInflationConvertQueryValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");

        // TÜFE 2003=100 serisi Ocak 2003'te başlar; başlangıç bu tabandan eski olamaz.
        // Üst sınır cari yıl: gelecekteki bir tarih sessizce "%0 enflasyon" üretmesin.
        RuleFor(x => x.FromMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.FromYear).InclusiveBetween(2003, DateTime.Now.Year);

        // Bitiş opsiyonel; verilirse geçerli ay/yıl olmalı ve ay+yıl BİRLİKTE gelmeli.
        RuleFor(x => x.ToMonth!.Value).InclusiveBetween(1, 12).When(x => x.ToMonth.HasValue);
        RuleFor(x => x.ToYear!.Value).InclusiveBetween(2003, DateTime.Now.Year).When(x => x.ToYear.HasValue);
        RuleFor(x => x)
            .Must(x => x.ToMonth.HasValue == x.ToYear.HasValue)
            .WithMessage("Bitiş ayı ve yılı birlikte verilmeli.");
    }
}
