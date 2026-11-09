# Secrets yönetimi

Hassas değerler artık `appsettings.json`'da **tutulmaz** — değerleri boştur ve runtime'da
config sağlayıcılarından (dev: user-secrets, prod: environment variables) gelir.

## Taşınan secret'lar

| Config anahtarı | Env var adı (prod) | Ne |
|---|---|---|
| `Jwt:SigningKey` | `Jwt__SigningKey` | JWT imza anahtarı (HMACSHA512) |
| `Smtp:Password` | `Smtp__Password` | Gmail uygulama şifresi (e-posta) |
| `AzureDocumentIntelligence:ApiKey` | `AzureDocumentIntelligence__ApiKey` | Azure OCR API anahtarı |
| `Evds:ApiKey` | `Evds__ApiKey` | TCMB EVDS3 API anahtarı (Faz 6 yatırım — döviz + aylık altın) |
| `GoogleAuth:ClientSecret` | `GoogleAuth__ClientSecret` | Google OAuth client secret — **web "code" akışı** için ZORUNLU. Yoksa code→id_token değişimi başarısız olur ve Google girişi `GOOGLE_AUTH_FAILED` döner. (Mobil id_token gönderdiği için secret gerektirmez; sadece web.) |
| `RevenueCat:WebhookAuthHeader` | `RevenueCat__WebhookAuthHeader` | RevenueCat webhook Authorization header secret (dashboard'da tanımlanır, webhook doğrulaması) |
| `RevenueCat:ProjectApiKey` | `RevenueCat__ProjectApiKey` | RevenueCat REST API anahtarı (gerekirse sunucudan customer sorgulama; webhook için şart değil) |
| `Stripe:SecretKey` | `Stripe__SecretKey` | Stripe secret key (Web Billing; RevenueCat Web Billing kullanıyorsa opsiyonel) |
| `Stripe:WebhookSecret` | `Stripe__WebhookSecret` | Stripe webhook imza secret'ı (doğrudan Stripe webhook kullanılırsa) |

> **Paywall (premium abonelik):** Tek entitlement kaynağı RevenueCat. Webhook ucu `POST /api/v1/webhooks/revenuecat`,
> `Authorization` header'ı `RevenueCat__WebhookAuthHeader` ile karşılaştırılır. Secret boşsa webhook **reddedilir** (401).
> Prod'da bu env var mutlaka set edilmeli, yoksa abonelik güncellemeleri DB'ye yazılmaz.

> .NET'te iç içe config anahtarı env var'da **çift alt çizgi** (`__`) ile yazılır.

## ⚠️ Deploy etmeden önce (Hetzner) — KRİTİK

Production ortamı (ASPNETCORE_ENVIRONMENT=Production) **user-secrets yüklemez.** Bu commit
canlıya çıkmadan ÖNCE sunucuda env var'lar set edilmeli, aksi halde JWT/SMTP/OCR kırılır
(login, e-posta, fiş okuma çalışmaz).

systemd servis kullanıyorsan `EnvironmentFile` ile (ör. `/etc/pararota/pararota.env`):

```
Jwt__SigningKey=<değer>
Smtp__Password=<değer>
AzureDocumentIntelligence__ApiKey=<değer>
```

Dosyayı `chmod 600` yap, servis unit'ine `EnvironmentFile=/etc/pararota/pararota.env` ekle,
`systemctl daemon-reload && systemctl restart pararota`.

Docker kullanıyorsan `-e Jwt__SigningKey=... -e Smtp__Password=... -e AzureDocumentIntelligence__ApiKey=...`
veya compose `environment:` / `env_file:`.

## Lokal geliştirme (dev)

Secret'lar `dotnet user-secrets`'ta (repo dışı, `~/.microsoft/usersecrets/<id>/`):

```bash
cd ParaRota.Backend
dotnet user-secrets set "Jwt:SigningKey" "<değer>" --project src/External/ParaRota.WebApi
dotnet user-secrets set "Smtp:Password" "<değer>" --project src/External/ParaRota.WebApi
dotnet user-secrets set "AzureDocumentIntelligence:ApiKey" "<değer>" --project src/External/ParaRota.WebApi
dotnet user-secrets set "Evds:ApiKey" "<değer>" --project src/External/ParaRota.WebApi
```

`UserSecretsId` WebApi csproj'unda tanımlı; Development ortamında otomatik yüklenir.

## Henüz taşınmadı (sonraki adım)

- `ConnectionStrings:DefaultConnection` (PROD DB şifresi) — PROD'da gerçek şifre kullanılıyorsa
  bunu da `ConnectionStrings__DefaultConnection` env var'ına taşı.
- `Gemini:ApiKey` — şu an boş, kullanıldığında env'e.
