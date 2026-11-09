namespace ParaRota.Domain.Abstractions;

public interface IAuditable
{
    DateTime CreatedDate { get; set; }
    DateTime? EditDate { get; set; }
    string? CreatedUser { get; set; }
    string? EditUser { get; set; }
}
