using ParaRota.Domain.Abstractions;

namespace ParaRota.Domain.Entities;

public class ErrorLog : BaseEntity
{
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public string? Source { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public string? UserId { get; set; }
    public int StatusCode { get; set; }
}
