using ParaRota.Application.DTOs.Loan;
using ParaRota.Domain.Enums;

namespace ParaRota.Application.Services;

public interface ILoanCostService
{
    /// <summary>
    /// Kredinin gerçek maliyetini (faiz + KKDF + BSMV) eşit taksitli yöntemle hesaplar.
    /// Konut türünde vergi istisnası uygulanır. Saf hesap — dış veri yok.
    /// </summary>
    LoanCostResultDto Calculate(decimal amount, decimal monthlyRatePercent, int termMonths, LoanType loanType, decimal dosyaMasrafi);
}
