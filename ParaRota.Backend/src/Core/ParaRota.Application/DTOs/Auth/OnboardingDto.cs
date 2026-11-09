namespace ParaRota.Application.DTOs.Auth;

/// <summary>İstemcinin tamamladığı onboarding (tanıtım turu) sürümü.</summary>
public class OnboardingDto
{
    public int Version { get; set; }

    /// <summary>"web" = WebOnboardingSeenVersion güncellenir; null/diğer = mobil (geriye uyumlu).</summary>
    public string? Platform { get; set; }
}
