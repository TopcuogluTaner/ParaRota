namespace ParaRota.Domain.Dtos;

public class ApiResponse<T>
{
    public bool IsSuccess { get; set; }
    public int StatusCode { get; set; }
    public string? Message { get; set; }

    /// <summary>
    /// Dilden bağımsız, stabil hata kodu (bkz. <see cref="Constants.ErrorCodes"/>). Frontend bunu
    /// <c>errors:&lt;CODE&gt;</c> i18n anahtarına çevirir; yoksa <see cref="Message"/>'a (Türkçe fallback) düşer.
    /// </summary>
    public string? ErrorCode { get; set; }

    public T? Data { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }

    public static ApiResponse<T> Success(T data, string? message = null, int statusCode = 200)
        => new() { IsSuccess = true, StatusCode = statusCode, Message = message, Data = data };

    public static ApiResponse<T> Ok(string? message = null, int statusCode = 200)
        => new() { IsSuccess = true, StatusCode = statusCode, Message = message };

    // errorCode, errors'tan SONRA konumlanır: mevcut Fail(message, status, errors) çağrıları bozulmaz.
    public static ApiResponse<T> Fail(string message, int statusCode = 400, Dictionary<string, string[]>? errors = null, string? errorCode = null)
        => new() { IsSuccess = false, StatusCode = statusCode, Message = message, Errors = errors, ErrorCode = errorCode };
}
