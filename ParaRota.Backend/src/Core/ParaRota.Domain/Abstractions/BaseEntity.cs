namespace ParaRota.Domain.Abstractions;

public abstract class BaseEntity : ISoftDeletable, IAuditable
{
    public int Id { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? EditDate { get; set; }
    public string? CreatedUser { get; set; }
    public string? EditUser { get; set; }
    public bool IsDeleted { get; set; }
}
