namespace ParaRota.Application.Services;

public interface IMailService
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);

    /// <summary>Tek dosya ekiyle HTML mail gönderir (ör. aylık özet PDF'i).</summary>
    Task SendWithAttachmentAsync(string to, string subject, string htmlBody, string attachmentFileName, byte[] attachmentBytes, CancellationToken cancellationToken = default);
}
