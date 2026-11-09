using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Mail;

public class SmtpMailService(IOptions<SmtpSettings> options, ILogger<SmtpMailService> logger) : IMailService
{
    private readonly SmtpSettings _settings = options.Value;

    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
        => SendCoreAsync(to, subject, htmlBody, attachmentFileName: null, attachmentBytes: null, cancellationToken);

    public Task SendWithAttachmentAsync(string to, string subject, string htmlBody, string attachmentFileName, byte[] attachmentBytes, CancellationToken cancellationToken = default)
        => SendCoreAsync(to, subject, htmlBody, attachmentFileName, attachmentBytes, cancellationToken);

    private async Task SendCoreAsync(string to, string subject, string htmlBody, string? attachmentFileName, byte[]? attachmentBytes, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.Host) || string.IsNullOrWhiteSpace(_settings.UserName))
        {
            logger.LogWarning(
                "SMTP yapılandırılmamış — mail gönderilmedi. To={To} Subject={Subject}. İçerik: {Body}",
                to, subject, htmlBody);
            return;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = htmlBody };
            if (attachmentBytes is { Length: > 0 } && !string.IsNullOrWhiteSpace(attachmentFileName))
                builder.Attachments.Add(attachmentFileName, attachmentBytes);
            message.Body = builder.ToMessageBody();

            // MailKit default'u 2 dk — SMTP kesintisinde istek thread'ini o kadar tutmasın.
            using var client = new SmtpClient { Timeout = 15_000 };
            var secureSocketOption = _settings.UseStartTls
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.SslOnConnect;

            await client.ConnectAsync(_settings.Host, _settings.Port, secureSocketOption, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_settings.UserName))
                await client.AuthenticateAsync(_settings.UserName, _settings.Password, cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Mail gönderilemedi. To={To} Subject={Subject}", to, subject);
            throw;
        }
    }
}
