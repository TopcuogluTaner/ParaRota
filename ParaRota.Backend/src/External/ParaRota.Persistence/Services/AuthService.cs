using System.Text.Json;
using AutoMapper;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParaRota.Application.Common.Settings;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Entities;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

public class AuthService(
    AppDbContext context,
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    IJwtProvider jwtProvider,
    IMailService mailService,
    IMapper mapper,
    INotificationDispatcher dispatcher,
    IGoogleAuthClient googleAuthClient,
    IAppleAuthClient appleAuthClient,
    ISubscriptionService subscriptionService,
    IOptions<GoogleAuthSettings> googleOptions,
    ILogger<AuthService> logger) : IAuthService
{
    private const int CodeLifetimeMinutes = 15;

    /// <summary>Bir kod için izin verilen hatalı deneme sayısı. Aşılınca kod iptal edilir
    /// (brute-force koruması) — kullanıcı yeni kod istemek zorunda kalır.</summary>
    private const int MaxCodeAttempts = 5;

    /// <summary>Yeni kullanıcıya verilen uygulama-yönetimli premium deneme süresi (gün).</summary>
    private const int TrialDays = 30;
    private readonly GoogleAuthSettings _googleSettings = googleOptions.Value;

    /// <summary>Auth akışını kırmadan mail gönderir. Resend/SMTP kesintisinde kullanıcı
    /// DB'ye zaten yazılmış oluyor; mail hatasının 500'e dönüşüp "zaten kayıtlı"
    /// çıkmazına sokmaması için hata yutulur, loglanır ve başarı durumu döner —
    /// çağıran yanıtı buna göre kurar (kod "Yeniden Gönder" ile tekrar istenebilir).</summary>
    private async Task<bool> TrySendMailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        try
        {
            await mailService.SendAsync(to, subject, htmlBody, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Auth maili gönderilemedi. To={To} Subject={Subject}", to, subject);
            return false;
        }
    }

    public async Task<ApiResponse<string>> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        var emailExists = await userManager.Users.AnyAsync(x => x.Email == dto.Email, cancellationToken);
        if (emailExists)
            return ApiResponse<string>.Fail("Bu e-posta zaten kayıtlı.", 409, errorCode: ErrorCodes.EmailAlreadyRegistered);

        var userNameExists = await userManager.Users.AnyAsync(x => x.UserName == dto.UserName, cancellationToken);
        if (userNameExists)
            return ApiResponse<string>.Fail("Bu kullanıcı adı zaten kayıtlı.", 409, errorCode: ErrorCodes.UsernameAlreadyRegistered);

        var code = jwtProvider.GenerateNumericCode();

        var user = new AppUser
        {
            UserName = dto.UserName,
            Email = dto.Email,
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            EmailConfirmed = false,
            EmailVerificationCode = code,
            EmailVerificationCodeExpiration = DateTime.Now.AddMinutes(CodeLifetimeMinutes),
            TrialEndsAt = DateTime.Now.AddDays(TrialDays),
        };

        var result = await userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return ApiResponse<string>.Fail(FormatIdentityErrors(result), 400, errorCode: ErrorCodes.IdentityError);

        if (!await roleManager.RoleExistsAsync(AppRoles.User))
            await roleManager.CreateAsync(new AppRole(AppRoles.User));

        await userManager.AddToRoleAsync(user, AppRoles.User);

        var verificationMailSent = await TrySendMailAsync(
            dto.Email,
            "ParaRota — E-posta Doğrulama Kodu",
            BuildVerificationEmail(user.FirstName, code),
            cancellationToken);

        // Welcome bildirimi — verify beklemeden yarat (idempotent DedupKey).
        var welcomePayload = JsonSerializer.Serialize(new { firstName = user.FirstName });
        var welcomeEnvelope = new NotificationEnvelope(
            UserId: user.Id,
            Type: NotificationType.System,
            Severity: NotificationSeverity.Info,
            TitleKey: "notif_welcome_title",
            MessageKey: "notif_welcome_body",
            Payload: welcomePayload,
            RefType: "user",
            RefId: user.Id,
            DedupKey: $"welcome:{user.Id}",
            PushTitle: "ParaRota'ya hoş geldin",
            PushBody: $"Merhaba {user.FirstName}, finansal yolculuğun başlıyor!");
        await dispatcher.DispatchAsync(welcomeEnvelope, cancellationToken);

        // Mail gitmediyse hesap yine de oluştu — kullanıcı "Kodu yeniden gönder" ile devam edebilir.
        return verificationMailSent
            ? ApiResponse<string>.Success(
                "Kayıt başarılı. E-postanıza gönderilen 6 haneli kod ile hesabınızı doğrulayın.",
                statusCode: 201)
            : ApiResponse<string>.Success(
                "Kayıt başarılı ancak doğrulama e-postası şu an gönderilemedi. Lütfen 'Kodu yeniden gönder' ile tekrar deneyin.",
                statusCode: 201);
    }

    public async Task<ApiResponse<string>> VerifyEmailAsync(VerifyEmailDto dto, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        // User enumeration'ı önlemek için bilinmeyen e-postada da hatalı-kod ile aynı generic yanıt.
        if (user is null)
            return ApiResponse<string>.Fail("Kod geçersiz veya süresi dolmuş.", 400, errorCode: ErrorCodes.CodeInvalidOrExpired);

        if (user.EmailConfirmed)
            return ApiResponse<string>.Success("E-posta zaten doğrulanmış.");

        // Aktif kod yok / süresi dolmuş.
        if (user.EmailVerificationCode is null ||
            user.EmailVerificationCodeExpiration is null ||
            user.EmailVerificationCodeExpiration < DateTime.Now)
            return ApiResponse<string>.Fail("Kod geçersiz veya süresi dolmuş.", 400, errorCode: ErrorCodes.CodeInvalidOrExpired);

        // Hatalı kod — deneme sayacını artır; eşik aşılınca kodu iptal et (brute-force koruması).
        if (user.EmailVerificationCode != dto.Code)
        {
            user.EmailVerificationCodeAttempts += 1;
            if (user.EmailVerificationCodeAttempts >= MaxCodeAttempts)
            {
                user.EmailVerificationCode = null;
                user.EmailVerificationCodeExpiration = null;
                user.EmailVerificationCodeAttempts = 0;
                await userManager.UpdateAsync(user);
                return ApiResponse<string>.Fail("Çok fazla hatalı deneme. Lütfen yeni kod isteyin.", 429, errorCode: ErrorCodes.CodeTooManyAttempts);
            }

            await userManager.UpdateAsync(user);
            return ApiResponse<string>.Fail("Kod geçersiz veya süresi dolmuş.", 400, errorCode: ErrorCodes.CodeInvalidOrExpired);
        }

        user.EmailConfirmed = true;
        user.EmailVerificationCode = null;
        user.EmailVerificationCodeExpiration = null;
        user.EmailVerificationCodeAttempts = 0;

        var update = await userManager.UpdateAsync(user);
        if (!update.Succeeded)
            return ApiResponse<string>.Fail(FormatIdentityErrors(update), 400, errorCode: ErrorCodes.IdentityError);

        return ApiResponse<string>.Success("E-posta doğrulandı.");
    }

    public async Task<ApiResponse<string>> ResendVerificationCodeAsync(ResendVerificationCodeDto dto, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user is null)
            return ApiResponse<string>.Success("Eğer kayıtlı bir hesap varsa, doğrulama kodu gönderildi.");

        if (user.EmailConfirmed)
            return ApiResponse<string>.Success("E-posta zaten doğrulanmış.");

        var code = jwtProvider.GenerateNumericCode();
        user.EmailVerificationCode = code;
        user.EmailVerificationCodeExpiration = DateTime.Now.AddMinutes(CodeLifetimeMinutes);
        user.EmailVerificationCodeAttempts = 0;

        await userManager.UpdateAsync(user);

        if (!await TrySendMailAsync(
                user.Email!,
                "ParaRota — Yeni Doğrulama Kodu",
                BuildVerificationEmail(user.FirstName, code),
                cancellationToken))
            return ApiResponse<string>.Fail("E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.", 503, errorCode: ErrorCodes.EmailSendFailed);

        return ApiResponse<string>.Success("Doğrulama kodu yeniden gönderildi.");
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = dto.EmailOrUserName.Contains('@')
            ? await userManager.FindByEmailAsync(dto.EmailOrUserName)
            : await userManager.FindByNameAsync(dto.EmailOrUserName);

        if (user is null || user.IsDeleted)
            return ApiResponse<AuthResponseDto>.Fail("Kullanıcı adı veya parola hatalı.", 401, errorCode: ErrorCodes.InvalidCredentials);

        // Hesap zaten kilitliyse — kalan süreyi bildir (user enumeration sızdırmadan,
        // çünkü bu noktaya yalnız geçerli bir kullanıcı için gelinir).
        if (await userManager.IsLockedOutAsync(user))
            return ApiResponse<AuthResponseDto>.Fail(BuildLockoutMessage(user), 423, errorCode: ErrorCodes.AccountLocked);

        if (!await userManager.CheckPasswordAsync(user, dto.Password))
        {
            // Hatalı parola — sayacı artır; eşik aşılırsa kilit devreye girer.
            await userManager.AccessFailedAsync(user);

            if (await userManager.IsLockedOutAsync(user))
                return ApiResponse<AuthResponseDto>.Fail(BuildLockoutMessage(user), 423, errorCode: ErrorCodes.AccountLocked);

            return ApiResponse<AuthResponseDto>.Fail("Kullanıcı adı veya parola hatalı.", 401, errorCode: ErrorCodes.InvalidCredentials);
        }

        if (!user.EmailConfirmed)
            return ApiResponse<AuthResponseDto>.Fail("E-postanız doğrulanmadı.", 403, errorCode: ErrorCodes.EmailNotVerified);

        // Başarılı parola doğrulaması — hatalı deneme sayacını sıfırla.
        if (await userManager.GetAccessFailedCountAsync(user) > 0)
            await userManager.ResetAccessFailedCountAsync(user);

        var loginTimestamp = DateTime.Now;
        user.LastLoginAt = loginTimestamp;
        await userManager.UpdateAsync(user);

        var response = await IssueTokensAsync(user, ipAddress, cancellationToken);

        // Not: Her girişte "yeni giriş" bildirimi kullanıcı isteğiyle kaldırıldı (gürültü).
        // LastLoginAt yine güncelleniyor (yukarıda); istenirse ileride opt-in güvenlik uyarısı eklenebilir.

        return ApiResponse<AuthResponseDto>.Success(response, "Giriş başarılı.");
    }

    public async Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(RefreshTokenDto dto, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var tokenHash = jwtProvider.ComputeSha256Hash(dto.RefreshToken);

        var existing = await context.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (existing is null)
            return ApiResponse<AuthResponseDto>.Fail("Geçersiz refresh token.", 401, errorCode: ErrorCodes.InvalidRefreshToken);

        if (!existing.IsActive)
        {
            // Token reuse — tüm aktif token'ları iptal et
            var activeTokens = await context.RefreshTokens
                .Where(x => x.UserId == existing.UserId && x.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var t in activeTokens)
            {
                t.RevokedAt = DateTime.Now;
                t.RevokedByIp = ipAddress;
            }

            await context.SaveChangesAsync(cancellationToken);
            return ApiResponse<AuthResponseDto>.Fail("Refresh token süresi dolmuş veya iptal edilmiş.", 401, errorCode: ErrorCodes.RefreshTokenExpired);
        }

        existing.RevokedAt = DateTime.Now;
        existing.RevokedByIp = ipAddress;

        var response = await IssueTokensAsync(existing.User, ipAddress, cancellationToken, replacing: existing);
        return ApiResponse<AuthResponseDto>.Success(response, "Token yenilendi.");
    }

    public async Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user is null)
            return ApiResponse<string>.Success("Eğer kayıtlı bir hesap varsa, sıfırlama kodu gönderildi.");

        var code = jwtProvider.GenerateNumericCode();
        user.PasswordResetCode = code;
        user.PasswordResetCodeExpiration = DateTime.Now.AddMinutes(CodeLifetimeMinutes);
        user.PasswordResetCodeAttempts = 0;

        await userManager.UpdateAsync(user);

        if (!await TrySendMailAsync(
                user.Email!,
                "ParaRota — Parola Sıfırlama Kodu",
                BuildResetPasswordEmail(user.FirstName, code),
                cancellationToken))
            return ApiResponse<string>.Fail("E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.", 503, errorCode: ErrorCodes.EmailSendFailed);

        return ApiResponse<string>.Success("Eğer kayıtlı bir hesap varsa, sıfırlama kodu gönderildi.");
    }

    public async Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        // User enumeration'ı önlemek için bilinmeyen e-postada da hatalı-kod ile aynı generic yanıt.
        if (user is null)
            return ApiResponse<string>.Fail("Kod geçersiz veya süresi dolmuş.", 400, errorCode: ErrorCodes.CodeInvalidOrExpired);

        // Aktif kod yok / süresi dolmuş.
        if (user.PasswordResetCode is null ||
            user.PasswordResetCodeExpiration is null ||
            user.PasswordResetCodeExpiration < DateTime.Now)
            return ApiResponse<string>.Fail("Kod geçersiz veya süresi dolmuş.", 400, errorCode: ErrorCodes.CodeInvalidOrExpired);

        // Hatalı kod — deneme sayacını artır; eşik aşılınca kodu iptal et (brute-force koruması).
        if (user.PasswordResetCode != dto.Code)
        {
            user.PasswordResetCodeAttempts += 1;
            if (user.PasswordResetCodeAttempts >= MaxCodeAttempts)
            {
                user.PasswordResetCode = null;
                user.PasswordResetCodeExpiration = null;
                user.PasswordResetCodeAttempts = 0;
                await userManager.UpdateAsync(user);
                return ApiResponse<string>.Fail("Çok fazla hatalı deneme. Lütfen yeni kod isteyin.", 429, errorCode: ErrorCodes.CodeTooManyAttempts);
            }

            await userManager.UpdateAsync(user);
            return ApiResponse<string>.Fail("Kod geçersiz veya süresi dolmuş.", 400, errorCode: ErrorCodes.CodeInvalidOrExpired);
        }

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, resetToken, dto.NewPassword);
        if (!result.Succeeded)
            return ApiResponse<string>.Fail(FormatIdentityErrors(result), 400, errorCode: ErrorCodes.IdentityError);

        user.PasswordResetCode = null;
        user.PasswordResetCodeExpiration = null;
        user.PasswordResetCodeAttempts = 0;
        await userManager.UpdateAsync(user);

        // Tüm aktif refresh token'ları iptal et
        var activeTokens = await context.RefreshTokens
            .Where(x => x.UserId == user.Id && x.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var t in activeTokens)
            t.RevokedAt = DateTime.Now;

        await context.SaveChangesAsync(cancellationToken);

        return ApiResponse<string>.Success("Parola sıfırlandı. Yeniden giriş yapabilirsiniz.");
    }

    public async Task<ApiResponse<string>> ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ApiResponse<string>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        var result = await userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return ApiResponse<string>.Fail(FormatIdentityErrors(result), 400, errorCode: ErrorCodes.IdentityError);

        return ApiResponse<string>.Success("Parola değiştirildi.");
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ApiResponse<UserDto>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        var roles = await userManager.GetRolesAsync(user);
        var dto = mapper.Map<UserDto>(user);
        dto.Roles = roles.ToList();

        // Premium kararı sunucudadır (UI'a güvenmeyiz). Abonelik + uygulama denemesinden hesaplanır.
        var premium = await subscriptionService.GetPremiumStatusAsync(user.Id, cancellationToken);
        dto.IsPremium = premium.IsPremium;
        dto.IsInTrial = premium.IsInTrial;
        dto.PremiumExpiresAt = premium.PremiumExpiresAt;
        dto.TrialEndsAt = premium.TrialEndsAt;
        dto.Plan = premium.Plan;

        return ApiResponse<UserDto>.Success(dto);
    }

    public async Task<ApiResponse<int>> SetOnboardingSeenAsync(int userId, int version, string? platform = null, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ApiResponse<int>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        // Yalnız ileri al — eski/daha küçük versiyon bayrağı geri sarmaz.
        // platform "web" ise web alanı, aksi halde mobil alan (geriye uyumlu: mobil platform göndermez).
        if (platform == "web")
        {
            if (version > user.WebOnboardingSeenVersion)
            {
                user.WebOnboardingSeenVersion = version;
                await userManager.UpdateAsync(user);
            }

            return ApiResponse<int>.Success(user.WebOnboardingSeenVersion);
        }

        if (version > user.OnboardingSeenVersion)
        {
            user.OnboardingSeenVersion = version;
            await userManager.UpdateAsync(user);
        }

        return ApiResponse<int>.Success(user.OnboardingSeenVersion);
    }

    public async Task<ApiResponse<string?>> SetAvatarAsync(int userId, string? avatar, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ApiResponse<string?>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        // Biçim doğrulaması SetAvatarCommandValidator'da; null/boş = rozeti kaldır.
        user.Avatar = string.IsNullOrWhiteSpace(avatar) ? null : avatar.Trim();
        await userManager.UpdateAsync(user);

        return ApiResponse<string?>.Success(user.Avatar);
    }

    public async Task<ApiResponse<bool>> SetMonthlyPdfEmailAsync(int userId, bool enabled, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ApiResponse<bool>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        if (user.SendMonthlyPdfEmail != enabled)
        {
            user.SendMonthlyPdfEmail = enabled;
            await userManager.UpdateAsync(user);
        }

        return ApiResponse<bool>.Success(user.SendMonthlyPdfEmail);
    }

    // ── Google ile giriş ─────────────────────────────────────────────────────
    public async Task<ApiResponse<AuthResponseDto>> GoogleSignInAsync(GoogleSignInDto dto, string? ipAddress, CancellationToken cancellationToken = default)
    {
        // Web "code" akışı → önce id_token'a çevir; mobil zaten id_token gönderir.
        var idToken = dto.IdToken;
        if (string.IsNullOrWhiteSpace(idToken) && !string.IsNullOrWhiteSpace(dto.Code))
            idToken = await googleAuthClient.ExchangeCodeForIdTokenAsync(dto.Code, cancellationToken);

        // idToken boş = "code" değişimi başarısız (genelde GoogleAuth:ClientSecret yapılandırılmamış)
        // ya da istemci id_token göndermedi. Bu bir KİMLİK BİLGİSİ hatası DEĞİL — ayrı kodla dön
        // ki kullanıcı yanlışlıkla "parola hatalı" görmesin.
        if (string.IsNullOrWhiteSpace(idToken))
            return ApiResponse<AuthResponseDto>.Fail("Google ile giriş doğrulanamadı.", 401, errorCode: ErrorCodes.GoogleAuthFailed);

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = _googleSettings.ClientIds,
            });
        }
        catch (Exception ex)
        {
            // Config hatası (yanlış ClientId/audience) bozuk token'la aynı görünmesin — logla.
            logger.LogWarning(ex, "Google id_token doğrulaması başarısız.");
            return ApiResponse<AuthResponseDto>.Fail("Google ile giriş doğrulanamadı.", 401, errorCode: ErrorCodes.GoogleAuthFailed);
        }

        if (string.IsNullOrWhiteSpace(payload.Email))
            return ApiResponse<AuthResponseDto>.Fail("Google hesabında e-posta yok.", 400, errorCode: ErrorCodes.GoogleAuthFailed);

        const string provider = "Google";
        var user = await userManager.FindByLoginAsync(provider, payload.Subject);

        if (user is null)
        {
            user = await userManager.FindByEmailAsync(payload.Email);
            if (user is null)
            {
                user = new AppUser
                {
                    UserName = payload.Email,
                    Email = payload.Email,
                    FirstName = payload.GivenName ?? string.Empty,
                    LastName = payload.FamilyName ?? string.Empty,
                    EmailConfirmed = true,
                    TrialEndsAt = DateTime.Now.AddDays(TrialDays),
                };
                var create = await userManager.CreateAsync(user);
                if (!create.Succeeded)
                    return ApiResponse<AuthResponseDto>.Fail(FormatIdentityErrors(create), 400, errorCode: ErrorCodes.IdentityError);

                if (!await roleManager.RoleExistsAsync(AppRoles.User))
                    await roleManager.CreateAsync(new AppRole(AppRoles.User));
                await userManager.AddToRoleAsync(user, AppRoles.User);
            }

            // Mevcut/yeni kullanıcıyı Google login'iyle bağla (AspNetUserLogins).
            await userManager.AddLoginAsync(user, new UserLoginInfo(provider, payload.Subject, provider));
            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                await userManager.UpdateAsync(user);
            }
        }

        user.LastLoginAt = DateTime.Now;
        await userManager.UpdateAsync(user);

        var response = await IssueTokensAsync(user, ipAddress, cancellationToken);
        return ApiResponse<AuthResponseDto>.Success(response, "Giriş başarılı.");
    }

    // ── Apple ile giriş ──────────────────────────────────────────────────────
    public async Task<ApiResponse<AuthResponseDto>> AppleSignInAsync(AppleSignInDto dto, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var payload = await appleAuthClient.ValidateAsync(dto.IdentityToken, cancellationToken);
        if (payload is null)
            return ApiResponse<AuthResponseDto>.Fail("Apple ile giriş doğrulanamadı.", 401, errorCode: ErrorCodes.AppleAuthFailed);

        const string provider = "Apple";
        var user = await userManager.FindByLoginAsync(provider, payload.Sub);

        if (user is null)
        {
            // E-posta yalnız İLK girişte gelir; varsa mevcut hesaba bağla.
            if (!string.IsNullOrWhiteSpace(payload.Email))
                user = await userManager.FindByEmailAsync(payload.Email);

            if (user is null)
            {
                // Apple private-relay veya e-posta yoksa benzersiz bir yer tutucu üret.
                var email = string.IsNullOrWhiteSpace(payload.Email) ? $"apple-{payload.Sub}@users.pararotam.com" : payload.Email;
                user = new AppUser
                {
                    UserName = email,
                    Email = email,
                    FirstName = dto.FirstName?.Trim() ?? string.Empty,
                    LastName = dto.LastName?.Trim() ?? string.Empty,
                    EmailConfirmed = true,
                    TrialEndsAt = DateTime.Now.AddDays(TrialDays),
                };
                var create = await userManager.CreateAsync(user);
                if (!create.Succeeded)
                    return ApiResponse<AuthResponseDto>.Fail(FormatIdentityErrors(create), 400, errorCode: ErrorCodes.IdentityError);

                if (!await roleManager.RoleExistsAsync(AppRoles.User))
                    await roleManager.CreateAsync(new AppRole(AppRoles.User));
                await userManager.AddToRoleAsync(user, AppRoles.User);
            }

            await userManager.AddLoginAsync(user, new UserLoginInfo(provider, payload.Sub, provider));
            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                await userManager.UpdateAsync(user);
            }
        }

        user.LastLoginAt = DateTime.Now;
        await userManager.UpdateAsync(user);

        var response = await IssueTokensAsync(user, ipAddress, cancellationToken);
        return ApiResponse<AuthResponseDto>.Success(response, "Giriş başarılı.");
    }

    // ── Hesap silme (kalıcı, geri alınamaz) ──────────────────────────────────
    public async Task<ApiResponse<string>> DeleteAccountAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ApiResponse<string>.Fail("Kullanıcı bulunamadı.", 404, errorCode: ErrorCodes.UserNotFound);

        // Başka aktif üyesi olan bir aileyi sahipleniyorsa → paylaşılan veriyi korumak için
        // önce sahipliği devretmesi / aileyi silmesi gerekir.
        var ownsSharedHousehold = await context.Households.IgnoreQueryFilters()
            .Where(h => h.OwnerUserId == userId && !h.IsDeleted)
            .AnyAsync(h => context.HouseholdMembers.IgnoreQueryFilters()
                .Any(m => m.HouseholdId == h.Id && m.UserId != userId
                          && m.Status == HouseholdMemberStatus.Active && !m.IsDeleted), cancellationToken);
        if (ownsSharedHousehold)
            return ApiResponse<string>.Fail(
                "Hesabını silmeden önce ailenin sahipliğini başka bir üyeye devret ya da aileyi sil.",
                409, errorCode: ErrorCodes.AccountOwnsSharedHousehold);

        await using var tx = await context.Database.BeginTransactionAsync(cancellationToken);

        // 1) Kullanıcının kayıtları — FK-güvenli sıra. IgnoreQueryFilters → soft-deleted dahil gerçek silme.
        await context.DebtPayments.IgnoreQueryFilters().Where(p => p.Debt.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Transactions.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.RecurringRules.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Budgets.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Goals.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Debts.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.InvestmentHoldings.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Notifications.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.DeviceTokens.IgnoreQueryFilters().Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);

        // 2) Kategoriler: üyesi olunan ailelerde kullanıcının oluşturduğu aile kategorilerini
        //    aile sahibine devret (diğer üyelerin işlemleri FK'den kopmasın); kişiselleri sil.
        var householdCats = await context.Categories.IgnoreQueryFilters()
            .Where(c => c.UserId == userId && c.HouseholdId != null)
            .ToListAsync(cancellationToken);
        foreach (var c in householdCats)
        {
            var ownerId = await context.Households.IgnoreQueryFilters()
                .Where(h => h.Id == c.HouseholdId)
                .Select(h => (int?)h.OwnerUserId)
                .FirstOrDefaultAsync(cancellationToken);
            if (ownerId is int oid && oid != userId)
                c.UserId = oid; // başka birinin sahip olduğu aile → devret
        }
        if (householdCats.Count > 0)
            await context.SaveChangesAsync(cancellationToken);
        await context.Categories.IgnoreQueryFilters()
            .Where(c => c.UserId == userId && c.HouseholdId == null)
            .ExecuteDeleteAsync(cancellationToken);

        // 3) Yalnız kullanıcının sahibi olduğu aileler → tüm veri + üyeler + davetler + ailenin kendisi.
        var soleHouseholdIds = await context.Households.IgnoreQueryFilters()
            .Where(h => h.OwnerUserId == userId)
            .Select(h => h.Id)
            .ToListAsync(cancellationToken);
        if (soleHouseholdIds.Count > 0)
        {
            await context.DebtPayments.IgnoreQueryFilters().Where(p => p.Debt.HouseholdId != null && soleHouseholdIds.Contains(p.Debt.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.Transactions.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.RecurringRules.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.Budgets.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.Goals.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.Debts.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.InvestmentHoldings.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.Categories.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.Notifications.IgnoreQueryFilters().Where(x => x.HouseholdId != null && soleHouseholdIds.Contains(x.HouseholdId!.Value)).ExecuteDeleteAsync(cancellationToken);
            await context.HouseholdInvites.IgnoreQueryFilters().Where(i => soleHouseholdIds.Contains(i.HouseholdId)).ExecuteDeleteAsync(cancellationToken);
            await context.HouseholdMembers.IgnoreQueryFilters().Where(m => soleHouseholdIds.Contains(m.HouseholdId)).ExecuteDeleteAsync(cancellationToken);
            await context.Households.IgnoreQueryFilters().Where(h => soleHouseholdIds.Contains(h.Id)).ExecuteDeleteAsync(cancellationToken);
        }

        // 4) Üyelikler + gönderdiği bekleyen davetler + başkalarındaki "davet eden" referansı.
        await context.HouseholdMembers.IgnoreQueryFilters().Where(m => m.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.HouseholdInvites.IgnoreQueryFilters().Where(i => i.InvitedByUserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.HouseholdMembers.IgnoreQueryFilters().Where(m => m.InvitedByUserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.InvitedByUserId, (int?)null), cancellationToken);

        // 5) Refresh token'lar.
        await context.RefreshTokens.IgnoreQueryFilters().Where(r => r.UserId == userId).ExecuteDeleteAsync(cancellationToken);

        // 6) Identity kullanıcı + alt tablolar — GERÇEK silme (ExecuteDelete soft-delete
        //    interceptor'ını atlar; userManager.DeleteAsync soft-delete'e düşerdi).
        await context.UserLogins.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.UserRoles.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.UserClaims.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.UserTokens.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await context.Users.IgnoreQueryFilters().Where(u => u.Id == userId).ExecuteDeleteAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);
        return ApiResponse<string>.Success("Hesabın ve tüm verilerin kalıcı olarak silindi.");
    }

    private async Task<AuthResponseDto> IssueTokensAsync(
        AppUser user,
        string? ipAddress,
        CancellationToken cancellationToken,
        RefreshToken? replacing = null)
    {
        var roles = await userManager.GetRolesAsync(user);
        var accessToken = jwtProvider.CreateAccessToken(user, roles);
        var refreshToken = jwtProvider.GenerateRefreshToken();
        var refreshHash = jwtProvider.ComputeSha256Hash(refreshToken);

        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = DateTime.Now.AddDays(jwtProvider.GetRefreshTokenExpiryDays()),
            CreatedByIp = ipAddress,
        };

        await context.RefreshTokens.AddAsync(newRefreshToken, cancellationToken);

        if (replacing is not null)
            replacing.ReplacedByTokenHash = refreshHash;

        await context.SaveChangesAsync(cancellationToken);

        var userDto = mapper.Map<UserDto>(user);
        userDto.Roles = roles.ToList();

        // Premium alanları login/refresh cevabında da dolu olmalı — yoksa yeni
        // kayıt olan kullanıcı, uygulamayı yeniden açana (/auth/me) kadar deneme
        // hakkına rağmen premium özellikleri kilitli görür.
        var premium = await subscriptionService.GetPremiumStatusAsync(user.Id, cancellationToken);
        userDto.IsPremium = premium.IsPremium;
        userDto.IsInTrial = premium.IsInTrial;
        userDto.PremiumExpiresAt = premium.PremiumExpiresAt;
        userDto.TrialEndsAt = premium.TrialEndsAt;
        userDto.Plan = premium.Plan;

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            AccessTokenExpiresAt = DateTime.Now.AddMinutes(jwtProvider.GetAccessTokenExpiryMinutes()),
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = newRefreshToken.ExpiresAt,
            User = userDto,
        };
    }

    private static string FormatIdentityErrors(IdentityResult result)
        => string.Join("; ", result.Errors.Select(e => e.Description));

    private static string BuildLockoutMessage(AppUser user)
    {
        var remaining = user.LockoutEnd.HasValue
            ? user.LockoutEnd.Value - DateTimeOffset.Now
            : TimeSpan.Zero;

        var minutes = remaining > TimeSpan.Zero
            ? (int)Math.Ceiling(remaining.TotalMinutes)
            : 1;

        return $"Çok fazla hatalı deneme. Hesabınız geçici olarak kilitlendi. " +
               $"Lütfen {minutes} dakika sonra tekrar deneyin.";
    }

    private static string BuildVerificationEmail(string firstName, string code)
        => EmailTemplates.VerificationCode(firstName, code, CodeLifetimeMinutes);

    private static string BuildResetPasswordEmail(string firstName, string code)
        => EmailTemplates.ResetPassword(firstName, code, CodeLifetimeMinutes);
}
