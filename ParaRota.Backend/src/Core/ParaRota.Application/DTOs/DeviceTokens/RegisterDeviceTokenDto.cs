using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.DeviceTokens;

public class RegisterDeviceTokenDto
{
    public string Token { get; set; } = string.Empty;
    public DevicePlatform Platform { get; set; }
}
