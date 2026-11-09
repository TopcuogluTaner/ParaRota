namespace ParaRota.Application.DTOs.Dashboard;

public class CategoryShareDto
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    // 0..1 oran (yüzde frontend'de hesaplanır)
    public double Share { get; set; }
}
