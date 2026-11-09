namespace ParaRota.Application.DTOs.SystemLogs;

/// <summary>Admin sistem logları görünümü — ExceptionMiddleware'in yazdığı ErrorLog kaydı.</summary>
public class ErrorLogDto
{
    public int Id { get; set; }
    public DateTime CreatedDate { get; set; }
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Source { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public string? UserId { get; set; }
    public string? StackTrace { get; set; }
}

/// <summary>Liste filtreleri: sayfalama + serbest metin arama + asgari HTTP durum kodu.</summary>
public class SystemLogListParams
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    /// <summary>Message / RequestPath içinde geçen metin (opsiyonel).</summary>
    public string? Search { get; set; }

    /// <summary>Yalnız bu kod ve üzeri (ör. 500 → yalnız sunucu hataları). Opsiyonel.</summary>
    public int? MinStatusCode { get; set; }
}
