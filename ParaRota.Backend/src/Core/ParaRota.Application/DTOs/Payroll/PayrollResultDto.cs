namespace ParaRota.Application.DTOs.Payroll;

// Tek bir ay için brüt→net kırılımı.
public class PayrollMonthDto
{
    public int Month { get; set; }
    public decimal Gross { get; set; }
    public decimal Sgk { get; set; }
    public decimal Unemployment { get; set; }
    public decimal IncomeTax { get; set; }   // asgari ücret istisnası düşülmüş (ele geçen)
    public decimal StampTax { get; set; }     // asgari ücret istisnası düşülmüş
    public decimal Net { get; set; }
    public decimal CumulativeBase { get; set; } // kümülatif gelir vergisi matrahı (bilgi amaçlı)
}

// Bir yıl için 12 aylık brüt→net tablosu + yıllık toplamlar.
public class PayrollResultDto
{
    public int Year { get; set; }
    public decimal GrossMonthly { get; set; }
    public decimal AnnualGross { get; set; }
    public decimal AnnualNet { get; set; }
    public decimal AnnualSgk { get; set; }
    public decimal AnnualUnemployment { get; set; }
    public decimal AnnualIncomeTax { get; set; }
    public decimal AnnualStamp { get; set; }
    public List<PayrollMonthDto> Months { get; set; } = new();
}
