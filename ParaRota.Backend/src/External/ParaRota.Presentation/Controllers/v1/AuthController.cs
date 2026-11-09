using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Features.AuthFeatures.Commands.AppleSignIn;
using ParaRota.Application.Features.AuthFeatures.Commands.ChangePassword;
using ParaRota.Application.Features.AuthFeatures.Commands.DeleteAccount;
using ParaRota.Application.Features.AuthFeatures.Commands.ForgotPassword;
using ParaRota.Application.Features.AuthFeatures.Commands.GoogleSignIn;
using ParaRota.Application.Features.AuthFeatures.Commands.Login;
using ParaRota.Application.Features.AuthFeatures.Commands.Register;
using ParaRota.Application.Features.AuthFeatures.Commands.ResendVerificationCode;
using ParaRota.Application.Features.AuthFeatures.Commands.ResetPassword;
using ParaRota.Application.Features.AuthFeatures.Commands.SetOnboardingSeen;
using ParaRota.Application.Features.AuthFeatures.Commands.SetAvatar;
using ParaRota.Application.Features.AuthFeatures.Commands.SetMonthlyPdfEmail;
using ParaRota.Application.Features.AuthFeatures.Commands.VerifyEmail;
using ParaRota.Application.Features.AuthFeatures.Queries.GetCurrentUser;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;
using RefreshTokenCommand = ParaRota.Application.Features.AuthFeatures.Commands.RefreshToken.RefreshTokenCommand;

namespace ParaRota.Presentation.Controllers.v1;

[ApiVersion("1.0")]
[EnableRateLimiting("auth-sensitive")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new RegisterCommand(dto), cancellationToken));

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new VerifyEmailCommand(dto), cancellationToken));

    [HttpPost("resend-verification-code")]
    public async Task<IActionResult> ResendVerificationCode([FromBody] ResendVerificationCodeDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new ResendVerificationCodeCommand(dto), cancellationToken));

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new LoginCommand(dto, currentUser.IpAddress), cancellationToken));

    [HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new RefreshTokenCommand(dto, currentUser.IpAddress), cancellationToken));

    // Google ile giriş.
    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleSignInDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new GoogleSignInCommand(dto, currentUser.IpAddress), cancellationToken));

    // Apple ile giriş.
    [HttpPost("apple")]
    public async Task<IActionResult> Apple([FromBody] AppleSignInDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new AppleSignInCommand(dto, currentUser.IpAddress), cancellationToken));

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new ForgotPasswordCommand(dto), cancellationToken));

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto, CancellationToken cancellationToken)
        => ToActionResult(await Sender.Send(new ResetPasswordCommand(dto), cancellationToken));

    [Authorize]
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return ToActionResult(await Sender.Send(new DeleteAccountCommand(currentUser.UserId.Value), cancellationToken));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return ToActionResult(await Sender.Send(new ChangePasswordCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [Authorize]
    [EnableRateLimiting("api-general")]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return ToActionResult(await Sender.Send(new GetCurrentUserQuery(currentUser.UserId.Value), cancellationToken));
    }

    [Authorize]
    [EnableRateLimiting("api-general")]
    [HttpPost("onboarding")]
    public async Task<IActionResult> SetOnboardingSeen([FromBody] OnboardingDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return ToActionResult(await Sender.Send(new SetOnboardingSeenCommand(currentUser.UserId.Value, dto.Version, dto.Platform), cancellationToken));
    }

    [Authorize]
    [EnableRateLimiting("api-general")]
    [HttpPost("avatar")]
    public async Task<IActionResult> SetAvatar([FromBody] AvatarDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return ToActionResult(await Sender.Send(new SetAvatarCommand(currentUser.UserId.Value, dto.Avatar), cancellationToken));
    }

    /// <summary>Aylık özet PDF e-postası tercihi (opt-in) — Ayarlar toggle'ı.</summary>
    [Authorize]
    [EnableRateLimiting("api-general")]
    [HttpPost("monthly-pdf-email")]
    public async Task<IActionResult> SetMonthlyPdfEmail([FromBody] MonthlyPdfEmailDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Unauthorized();

        return ToActionResult(await Sender.Send(new SetMonthlyPdfEmailCommand(currentUser.UserId.Value, dto.Enabled), cancellationToken));
    }
}
