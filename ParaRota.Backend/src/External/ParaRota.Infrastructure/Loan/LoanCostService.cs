using Microsoft.Extensions.Options;
using ParaRota.Application.DTOs.Loan;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;

namespace ParaRota.Infrastructure.Loan;

/// <summary>
/// Kredi gerçek maliyeti hesaplayıcı. Eşit taksitli (anüite): taksit, aylık maliyet oranı
/// m = faiz × (1 + KKDF + BSMV) üzerinden hesaplanır (bankaların ödeme planıyla eşleşen yöntem).
/// Konut'ta KKDF/BSMV istisnası (m = faiz). Dış veri yok; stateless singleton.
/// </summary>
public class LoanCostService(IOptions<LoanSettings> options) : ILoanCostService
{
    private readonly LoanSettings _settings = options.Value;

    public LoanCostResultDto Calculate(decimal amount, decimal monthlyRatePercent, int termMonths, LoanType loanType, decimal dosyaMasrafi)
    {
        var faiz = monthlyRatePercent / 100m;
        // Konut: KKDF/BSMV istisna. İhtiyaç/Taşıt: config oranları.
        var (kkdf, bsmv) = loanType == LoanType.Konut ? (0m, 0m) : (_settings.KkdfRate, _settings.BsmvRate);
        var taxRate = kkdf + bsmv;          // faiz üzerine binen toplam vergi oranı
        var m = faiz * (1m + taxRate);      // aylık maliyet oranı

        // Taksit (anüite). m = 0 (faizsiz) → eşit anapara.
        decimal taksit;
        if (m <= 0m)
        {
            taksit = Math.Round(amount / termMonths, 2);
        }
        else
        {
            // Hesabı double'da yap; (1+m)^n decimal max'ı aşabilir (uzun vade + yüksek faiz).
            // pow/(pow−1) oranı ~1 olduğundan nihai taksit küçük → decimal cast güvenli.
            var mD = (double)m;
            var pow = Math.Pow(1d + mD, termMonths);
            taksit = Math.Round((decimal)((double)amount * mD * pow / (pow - 1d)), 2);
        }

        // Ay ay amortisman — faiz/vergi azalan bakiye üzerinden; son taksit kalanı kapatır.
        var schedule = new List<LoanScheduleRowDto>(termMonths);
        decimal balance = amount, totalInterest = 0m, totalTax = 0m;
        for (var i = 1; i <= termMonths; i++)
        {
            var faizPart = balance * faiz;
            var taxPart = faizPart * taxRate;
            var cost = faizPart + taxPart;          // = balance * m
            var principal = i == termMonths ? balance : taksit - cost;

            totalInterest += faizPart;
            totalTax += taxPart;
            balance -= principal;
            if (balance < 0m) balance = 0m;

            schedule.Add(new LoanScheduleRowDto
            {
                Month = i,
                Principal = Math.Round(principal, 2),
                Interest = Math.Round(faizPart, 2),
                Tax = Math.Round(taxPart, 2),
                Balance = Math.Round(balance, 2),
            });
        }

        // Toplamlar amortismandan (yuvarlama sürüklenmesi olmasın): geri ödeme = anapara + faiz + vergi.
        var totalPayment = Math.Round(amount + totalInterest + totalTax, 2);
        var annualCost = m <= 0m ? 0d : Math.Pow(1d + (double)m, 12) - 1d; // (1+m)^12 − 1

        return new LoanCostResultDto
        {
            Amount = amount,
            MonthlyRatePercent = monthlyRatePercent,
            TermMonths = termMonths,
            DosyaMasrafi = dosyaMasrafi,
            KkdfPercent = Math.Round(kkdf * 100m, 2),
            BsmvPercent = Math.Round(bsmv * 100m, 2),
            MonthlyPayment = taksit,
            TotalPayment = totalPayment,
            TotalInterest = Math.Round(totalInterest, 2),
            TotalTax = Math.Round(totalTax, 2),
            TotalCost = Math.Round(totalInterest + totalTax + dosyaMasrafi, 2),
            MonthlyCostRatePercent = Math.Round(m * 100m, 2),
            AnnualCostRatePercent = Math.Round((decimal)annualCost * 100m, 2),
            NominalAnnualRatePercent = Math.Round(monthlyRatePercent * 12m, 2),
            Schedule = schedule,
        };
    }
}
