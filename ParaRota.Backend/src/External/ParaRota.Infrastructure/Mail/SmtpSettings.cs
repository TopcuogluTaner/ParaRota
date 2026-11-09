namespace ParaRota.Infrastructure.Mail;

public class SmtpSettings
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = "ParaRota";
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
