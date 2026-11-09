using System.Net;

namespace ParaRota.Persistence.Services;

/// <summary>
/// ParaRotam markalı HTML e-posta şablonları. "Calm Ledger" paletiyle (mobil
/// tokens.ts ile aynı renkler) tutarlı, e-posta istemcilerinde güvenli (tablo
/// tabanlı + inline stil) gövdeler üretir.
/// </summary>
internal static class EmailTemplates
{
    // tokens.ts (light) ile birebir.
    private const string Ink = "#0E0E0C";
    private const string InkSoft = "#525250";
    private const string InkMute = "#8A8A87";
    private const string Line = "#E8E8E2";
    private const string Paper = "#FFFFFF";
    private const string Tint = "#FAFAF7";
    private const string BgAlt = "#F4F4EE";
    private const string Go = "#15803D";
    private const string GoSoft = "#22C55E";
    private const string HeroBg = "#0E0E0C";
    private const string HeroFg = "#FAFAF7";

    private const string SerifStack = "'Fraunces', Georgia, 'Times New Roman', serif";
    private const string SansStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    private const string MonoStack = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

    /// <summary>Doğrulama kodu maili (kayıt + tekrar gönder).</summary>
    public static string VerificationCode(string firstName, string code, int expiryMinutes) => Layout(
        preheader: $"ParaRotam doğrulama kodun: {code}",
        heading: "E-postanı doğrula",
        bodyHtml: $"""
            {Greeting(firstName)}
            {Paragraph("ParaRotam hesabını etkinleştirmek için aşağıdaki 6 haneli kodu uygulamaya gir.")}
            {CodeBlock(code)}
            {Hint($"Kod {expiryMinutes} dakika boyunca geçerli. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.")}
            """);

    /// <summary>Parola sıfırlama kodu maili.</summary>
    public static string ResetPassword(string firstName, string code, int expiryMinutes) => Layout(
        preheader: $"ParaRotam parola sıfırlama kodun: {code}",
        heading: "Parolanı sıfırla",
        bodyHtml: $"""
            {Greeting(firstName)}
            {Paragraph("Parolanı yenilemek için aşağıdaki 6 haneli kodu kullan.")}
            {CodeBlock(code)}
            {Hint($"Kod {expiryMinutes} dakika boyunca geçerli. Parola değişikliği talep etmediysen hesabın güvende — bu e-postayı yok sayman yeterli.")}
            """);

    /// <summary>Aile (household) davet maili. Web butonu + mobil uygulama linki + kod fallback.</summary>
    public static string HouseholdInvite(string householdName, string acceptUrl, string appUrl, string token, int expiryDays) => Layout(
        preheader: $"\"{householdName}\" ailesine ParaRotam daveti",
        heading: "Bir aileye davet edildin",
        bodyHtml: $"""
            {Paragraph($"ParaRotam'da <strong style=\"color:{Ink}\">{Enc(householdName)}</strong> ailesine katılman için davet edildin. Aile bütçesini, harcamaları ve hedefleri birlikte yönetebilirsiniz.")}
            {Button("Daveti kabul et", acceptUrl)}
            {Paragraph($"<span style=\"color:{InkMute};font-size:13px\">Telefonunda ParaRotam yüklüyse:</span><br><a href=\"{appUrl}\" style=\"color:{Go};font-size:14px;font-weight:600;text-decoration:none\">Mobil uygulamada aç</a>")}
            {Paragraph($"<span style=\"color:{InkMute};font-size:13px\">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:</span><br><a href=\"{acceptUrl}\" style=\"color:{Go};font-size:13px;word-break:break-all\">{Enc(acceptUrl)}</a>")}
            {Paragraph($"<span style=\"color:{InkMute};font-size:13px\">Ya da uygulamada Aile &gt; Daveti kabul et ekranına bu kodu yapıştır:</span>")}
            {TokenBlock(token)}
            {Hint($"Davet {expiryDays} gün içinde geçerli. Bu daveti beklemiyorsan e-postayı yok sayabilirsin.")}
            """);

    /// <summary>Aylık özet PDF maili — rapor ekte; gövde kısa yönlendirme.</summary>
    public static string MonthlyPdf(string firstName, string monthDisplay) => Layout(
        preheader: $"ParaRotam {monthDisplay} özetin ekte.",
        heading: $"{monthDisplay} özetin hazır",
        bodyHtml: $"""
            {Greeting(firstName)}
            {Paragraph($"<strong style=\"color:{Ink}\">{Enc(monthDisplay)}</strong> dönemine ait gelir-gider özetin bu e-postanın ekinde PDF olarak yer alıyor.")}
            {Hint("Bu e-postayı Ayarlar'daki \"Aylık özet PDF'i e-postama gönder\" tercihini açtığın için alıyorsun; istediğin zaman kapatabilirsin.")}
            """);

    // ---- yapı taşları ----

    private static string Greeting(string firstName)
    {
        // Google sign-in vb. bazı hesaplarda FirstName boş olabilir → "Merhaba ," yerine isimsiz selam.
        var greeting = string.IsNullOrWhiteSpace(firstName) ? "Merhaba," : $"Merhaba {Enc(firstName)},";
        return $"<p style=\"margin:0 0 14px;font-family:{SansStack};font-size:16px;line-height:1.5;color:{Ink}\">{greeting}</p>";
    }

    private static string Paragraph(string html) =>
        $"<p style=\"margin:0 0 16px;font-family:{SansStack};font-size:15px;line-height:1.6;color:{InkSoft}\">{html}</p>";

    private static string Hint(string text) =>
        $"<p style=\"margin:24px 0 0;font-family:{SansStack};font-size:13px;line-height:1.6;color:{InkMute}\">{Enc(text)}</p>";

    private static string CodeBlock(string code) => $"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
          <tr><td align="center">
            <div style="display:inline-block;background:{Tint};border:1px solid {Line};border-radius:14px;padding:18px 28px">
              <span style="font-family:{MonoStack};font-size:34px;font-weight:700;letter-spacing:10px;color:{Ink}">{Enc(code)}</span>
            </div>
          </td></tr>
        </table>
        """;

    /// <summary>32 karakterlik davet kodu — küçük mono blok (elle yapıştırma fallback'i).</summary>
    private static string TokenBlock(string token) => $"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0">
          <tr><td align="center">
            <div style="display:inline-block;background:{Tint};border:1px solid {Line};border-radius:10px;padding:10px 14px">
              <span style="font-family:{MonoStack};font-size:13px;letter-spacing:1px;color:{Ink};word-break:break-all">{Enc(token)}</span>
            </div>
          </td></tr>
        </table>
        """;

    private static string Button(string label, string url) => $"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 4px">
          <tr><td align="center" bgcolor="{Go}" style="border-radius:12px">
            <a href="{url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:{SansStack};font-size:15px;font-weight:600;color:{HeroFg};text-decoration:none;border-radius:12px">{Enc(label)}</a>
          </td></tr>
        </table>
        """;

    private static string Layout(string preheader, string heading, string bodyHtml) => $"""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="color-scheme" content="light">
          <title>ParaRotam</title>
        </head>
        <body style="margin:0;padding:0;background:{BgAlt};-webkit-text-size-adjust:100%">
          <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">{Enc(preheader)}</span>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BgAlt}">
            <tr><td align="center" style="padding:32px 16px">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:{Paper};border:1px solid {Line};border-radius:20px;overflow:hidden">

                <!-- hero -->
                <tr><td style="background:{HeroBg};padding:28px 36px">
                  <span style="font-family:{SerifStack};font-size:24px;font-weight:600;letter-spacing:-0.5px;color:{HeroFg}">Para<span style="color:{GoSoft}">Rota</span></span>
                  <div style="margin-top:4px;font-family:{SansStack};font-size:12px;letter-spacing:0.5px;color:rgba(250,250,247,0.55)">Finansal yolculuğun</div>
                </td></tr>

                <!-- body -->
                <tr><td style="padding:36px">
                  <h1 style="margin:0 0 20px;font-family:{SerifStack};font-size:22px;font-weight:600;line-height:1.3;color:{Ink}">{Enc(heading)}</h1>
                  {bodyHtml}
                </td></tr>

                <!-- footer -->
                <tr><td style="padding:24px 36px;border-top:1px solid {Line};background:{Tint}">
                  <p style="margin:0;font-family:{SansStack};font-size:12px;line-height:1.6;color:{InkMute}">Bu e-posta ParaRotam tarafından otomatik gönderildi, lütfen yanıtlama.<br>© {DateTime.Now.Year} ParaRotam · Finansal yolculuğun</p>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    private static string Enc(string value) => WebUtility.HtmlEncode(value);
}
