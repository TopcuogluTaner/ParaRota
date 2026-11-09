# ParaRota.Backend — CLAUDE.md

ParaRota uygulamasının yeni .NET 10 + PostgreSQL Clean Architecture backend'i. **Yazım hataları yok** (Persistence/Entities/Abstraction/AssemblyReference — hepsi doğru yazımıyla).

## Build & Run

- Build: `dotnet build ParaRota.Backend.sln`
- Çalıştır: `dotnet run --project src/External/ParaRota.WebApi` (Development'ta Swagger `/swagger`, Hangfire dashboard `/hangfire`)
- DB: `docker compose up -d` (Postgres 16, db=`pararota`, user/pwd `postgres/postgres`, port 5432)
- Migration: `dotnet ef migrations add <Name> --project src/External/ParaRota.Persistence --startup-project src/External/ParaRota.WebApi`
- Uygulama başlangıçta otomatik `MigrateAsync()`, rol seeding (Admin/User) ve sistem kategorileri seed'i yapar.

## Mimari (6 katman)

```
WebApi → {Presentation, Application, Persistence, Infrastructure}
{Application, Persistence, Infrastructure} → Domain
{Persistence, Presentation} → Application
```

- **Domain** — `Abstractions/` (BaseEntity, ISoftDeletable, IAuditable), `Entities/` (AppUser : IdentityUser<int>, AppRole : IdentityRole<int>, RefreshToken, ErrorLog), `Repositories/` (IRepository<T>, IUnitOfWork), `Dtos/` (ApiResponse<T>, PagedResponse<T>, PaginationRequest), `Constants/AppRoles`.
- **Application** — MediatR features under `Features/<X>Features/Commands|Queries/<Name>/` as `*Command.cs` + `*Handler.cs` + `*Validator.cs` triples. Service interfaces in `Services/` (IAuthService, IJwtProvider, IMailService, ICurrentUserService). `Behaviors/ValidationBehavior` is a MediatR `IPipelineBehavior` that throws `FluentValidation.ValidationException`. AutoMapper profiles under `Common/Mappings/`.
- **Persistence** — `Context/AppDbContext` extends `IdentityDbContext<AppUser, AppRole, int>`, applies global query filter for `ISoftDeletable`, audit auto-stamps in `SaveChangesAsync`. EF configs in `Configurations/`. Generic `Repository<T>` + `UnitOfWork`. `Services/AuthService` implements `IAuthService` using `UserManager`/`RoleManager`.
- **Infrastructure** — `Authentication/JwtProvider` (HmacSha512 access + base64 refresh + SHA256 hash + 6 digit codes) + `JwtSettings`. `Mail/SmtpMailService` (MailKit). `Services/CurrentUserService` (HttpContext-based). `Ocr/AzureReceiptOcrService` (Azure DI prebuilt-receipt + magic bytes validation). `Reporting/PdfReportGenerator` (QuestPDF Fluent) + `Reporting/XlsxReportGenerator` (ClosedXML) — interface'leri `Application/Services/Reporting/` altında (Persistence Infrastructure'a doğrudan ref vermez).
- **Presentation** — Controllers inherit `Abstraction/ApiController` (exposes `Sender`, `ToActionResult`). Loaded into WebApi via `AddApplicationPart(Presentation.AssemblyReference.Assembly)`.
- **WebApi** — `Program.cs` is minimal; bootstrap via `IServiceInstaller` discovery (below).

## Bootstrap: `IServiceInstaller` discovery

`builder.Services.InstallServices(builder.Configuration, AssemblyReference.Assembly)` reflects over the WebApi assembly and runs every concrete `IServiceInstaller`:

- `ApplicationServiceInstaller` — `AddApplication()` (MediatR scan, FluentValidation scan, AutoMapper, `ValidationBehavior`)
- `PersistenceServiceInstaller` — `AddPersistence(config)` (DbContext, IdentityCore + Roles, Repos, AuthService)
- `InfrastructureServiceInstaller` — `AddInfrastructure(config)` (JwtProvider, MailService, CurrentUserService)
- `AuthorizationServiceInstaller` — JWT bearer from `JwtSettings`
- `PresentationServiceInstaller` — `AddControllers` + `AddApplicationPart` for Presentation + JSON options
- `ApiVersioningServiceInstaller` — `Asp.Versioning` with `UrlSegmentApiVersionReader` (`/api/v1/...`)
- `RateLimitingServiceInstaller` — three policies: `auth-sensitive` (5/dk), `auth-standard` (10/dk), `api-general` (60/dk sliding)
- `SwaggerServiceInstaller` — Swagger + Bearer security definition
- `CorsServiceInstaller` — reads `Cors:AllowedOrigins` (default `localhost:5173`)
- `HangfireServiceInstaller` — Hangfire.PostgreSql storage + `HangfireDashboardAuth` filter (`/hangfire` admin-only)
- `SignalRServiceInstaller` — Hub registration + `IConnectionTracker` (NotificationsHub at `/hubs/notifications`)

**Add new cross-cutting wiring by creating a new installer in `WebApi/Configuration/`, never by editing `Program.cs`.**

## Hangfire recurring jobs

Three daily jobs configured in `Program.cs` (server local time):

| Job ID | Cron | Service method |
|---|---|---|
| `recurring-rules-daily` | `02:05` | `IRecurringRuleService.RunDueAsync` — vadesi gelen kuralları Transaction'a çevir |
| `household-invites-expire` | `02:10` | `IHouseholdService.ExpireOldInvitesAsync` — süresi geçen davetleri Expired'a düşür |
| `debts-due-reminders` | `02:15` | `IDebtService.SendDuePaymentRemindersAsync` — 3 gün önceden hatırlat, `LastReminderSentDate` ile günde 1 garanti |

Per-rule try/catch wrap zorunlu (bir kural patladığında diğerlerini durdurmasın). Dispatch fail → `logger.LogWarning`, sessiz catch yasak.

## Conventions

- **Always `DateTime.Now`, never `DateTime.UtcNow`.** `AppDbContext.SaveChangesAsync` auto-stamps `CreatedDate`/`EditDate` for `IAuditable`; new code must follow.
- **Soft delete** — entities implementing `ISoftDeletable` (via `BaseEntity`) get a global query filter (`IsDeleted == false`). Don't manually filter `!x.IsDeleted` in handlers. `Remove(entity)` converts to soft delete in `SaveChangesAsync`.
- **AppUser** is the only non-`BaseEntity` domain entity — it extends `IdentityUser<int>` but still implements `ISoftDeletable` + `IAuditable`.
- **JWT** — HMACSHA512, access 8 hours, refresh 30 days, refresh-token rotation active (reuse triggers full revocation of user's active tokens).
- **Identity features active** — Email confirmation (6 digit code, 15 min lifetime), refresh-token rotation, role-based auth (Admin/User). **Lockout açık** (5 hatalı deneme → 5 dk kilit, `AllowedForNewUsers=true`); login akışı IsLockedOut→423, hatada AccessFailed, başarıda ResetAccessFailedCount. Rate limiting ile birlikte iki katmanlı brute-force koruması.
- **Env-keyed connection strings** — `appsettings.json` selects via `AppSettings:Environment` (TEST/PROD) and `EnvConfig:{ENV}:ConnectionStrings:DefaultConnection`. Fallback to `ConnectionStrings:DefaultConnection`.
- **Exceptions** — `ExceptionMiddleware` catches: `ValidationException` → 400 with errors dictionary, others → 500 + persists `ErrorLog`.
- **Hata kodları (i18n sözleşmesi)** — Her `ApiResponse.Fail(...)` dilden bağımsız stabil bir `errorCode` taşır (`Domain/Constants/ErrorCodes.cs`). Frontend kodu `errors:<CODE>` i18n anahtarına çevirir (kullanıcının dili); `Message` Türkçe fallback olarak kalır (log + map'lenmemiş kod). **Yeni `Fail(...)` eklerken `errorCode: ErrorCodes.X` ver** ve kodu 5 dile (`errors.json` web+mobil) ekle. DİNAMİK mesajlar (string interpolation, `FormatIdentityErrors`, `BuildLockoutMessage`) için i18n anahtarı eklenmez → resolver `Message`'a düşer. Web: `resolveApiError`/`notifyError` (`shared/lib/apiError.ts`).
- **Controller pattern** — inherit `ApiController`, inject `ISender` + `ICurrentUserService` where needed, action body just `Sender.Send(...)` + `ToActionResult(...)`. Bazı servisler (Categories, Transactions, Budgets, Goals, RecurringRules, Debts, Receipts, Dashboard) MediatR sarmalı **olmadan** doğrudan service çağırıyor — kararname için bu kabul; yeni feature MediatR pattern'i izlemeli.

### Household scope (kritik sözleşme — 2 durum)

Her domain entity (Transaction, Budget, Category, Goal, RecurringRule, Debt) **iki** modda yaşar (Plan C / `SharedWithHouseholdId` kaldırıldı — 2026-06 sadeleştirme):
- **Kişisel** — `UserId = X, HouseholdId IS NULL` → yalnız sahibi görür
- **Aile** — `HouseholdId = Y` (kullanıcı aile üyesi) → ailedeki herkes görür

Aktif scope HTTP header `X-Active-Household-Id` ile gelir, `ICurrentUserService.ActiveHouseholdId`'ye yansır. `HouseholdScope` helper (`Persistence/Services/`) ortak yardımcılar sağlar:
- `ResolveActiveScopeAsync(ctx, userId, activeId, ct)` — activeId null veya kullanıcı üye değilse `null` döner; **her servis bu helper'ı kullanır**.
- `IsActiveMemberAsync`, `IsOwnerOrAdminAsync` — yetki check'leri. `IsOwnerOrAdminAsync` artık **yalnız aile yönetimi** (üye davet/çıkar/rol/aile sil) için; veri düzenlemeyi yönetmez.

**Read pattern (her domain için):**
```csharp
var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);
var query = scope.HasValue
    ? ctx.X.Where(x => x.HouseholdId == scope.Value)
    : ctx.X.Where(x => x.HouseholdId == null && x.UserId == userId);
```

**Sahiplik kuralı (Update/Delete/AddPayment/ExecuteTransaction):** Her kaydı **yalnız oluşturan** düzenler/siler — aile kaydı olsa bile owner/admin başkasının kaydına dokunamaz:
```csharp
if (entity.UserId != userId)
    return Fail("Bu kaydı yalnız oluşturan düzenleyebilir.", 403);
```
(CategoryService'te ek olarak `IsSystem` guard korunur — sistem kategorisi düzenlenemez/silinemez.)

**Raporlama**: Plan C gittiği için çift-sayım split'i yok; Dashboard/Budget/Export agregasyonları doğrudan aktif scope'un `txBase`'ini kullanır.

**Kaydı taşıma (re-scope):** `PATCH /api/v1/transactions/{id}/scope` (`MoveTransactionScopeDto { TargetHouseholdId, CategoryId }`) bir işlemi kişisel ↔ aile arasında taşır. Yalnız sahibi; hedef kapsamda geçerli kategori zorunlu (kişisel kategori ailede geçersiz olabilir).

`HouseholdTransferMode` enum (`Domain.Enums`): `None=0` | `Move=1`. Yeni aile oluştururken `CreateHouseholdDto.TransferMode`:
- None (varsayılan) — mevcut veriler kişisel kalır
- Move — mevcut kişisel kayıtların `HouseholdId`'si aileye taşınır (kişisel boşalır)

### Idempotency & dedup (yaygın pattern'ler)

- **Recurring Tx**: unique index `(RuleId, TransactionDate) WHERE RuleId IS NOT NULL` → aynı kural × aynı gün duplicate üretilmez.
- **Notification**: unique constraint `(UserId, DedupKey)`. PostgreSQL'de NULL'lar farklı kabul edilir (default), null DedupKey çakışma yapmaz. 23505 → silent skip.
- **PostgresException 23505 strongly-typed**: `ex.InnerException is PostgresException pg && pg.SqlState == "23505"` (Npgsql.PostgresException).
- **Debt reminder spam guard**: `Debt.LastReminderSentDate` günde 1 reminder garantisi.

## Adding a feature

1. (Domain) — if new entity, add under `Entities/`, inherit `BaseEntity`. Add an `IEntityTypeConfiguration<T>` in `Persistence/Configurations/`.
2. (Application) — create `Features/<X>Features/Commands|Queries/<Name>/` with `*Command|Query.cs` + `*Handler.cs` + `*Validator.cs`. MediatR + FluentValidation auto-register via assembly scan.
3. (Service) — interface in `Application/Services/`, impl in `Persistence/Services/` (DB-backed) or `Infrastructure/` (external); register inside `AddPersistence` / `AddInfrastructure`.
4. (Controller) — add action on a controller inheriting `ApiController`. `[Authorize]` on protected endpoints; apply `[EnableRateLimiting("...")]` to sensitive ones.
5. Migration: `dotnet ef migrations add <Name> --project src/External/ParaRota.Persistence --startup-project src/External/ParaRota.WebApi`.

## Modules (Faz 0 → Faz 4 V1+V2; aile modülü 2-durum sadeleştirmesi tamam)

| Modül | Path | Notlar |
|---|---|---|
| **Auth** | `Application/Features/AuthFeatures/` | Register/VerifyEmail/ResendCode/Login/Refresh/Forgot/Reset/ChangePassword/Me. Rate-limit `auth-sensitive` controller-level. |
| **Categories** | `Persistence/Services/CategoryService.cs` | Sistem (UserId=NULL, IsSystem=true) + per-user + aile. Seed runner. Sahiplik: yalnız oluşturan düzenler. |
| **Transactions** | `Persistence/Services/TransactionService.cs` | CRUD + filter/pagination + `MoveScopeAsync` (kişisel↔aile taşıma). Sahiplik kuralı uygulanır. |
| **RecurringRules** | `Persistence/Services/RecurringRuleService.cs` | CRUD + immediate execute + Hangfire `RunDueAsync`. Per-rule try/catch + rule başına tek SaveChanges (sweep 2 batch). |
| **Budgets** | `Persistence/Services/BudgetService.cs` | CRUD + status calc (spent/remaining/usage/alertLevel) + aile scope'unda `MemberBreakdown` (kişi kırılımı). |
| **Goals** | `Persistence/Services/GoalService.cs` | CRUD + status enum + funding ile linked transactions. |
| **Debts (Faz 3-A)** | `Persistence/Services/DebtService.cs` | Payable/Receivable + Auto/Manual mode + payment history. Auto mode atomic tx (rollback). LinkedRule cleanup on delete. `LastReminderSentDate` + `DebtReminderSettings.HorizonDays` config. |
| **Receipts/OCR (Faz 3-B)** | `Infrastructure/Ocr/AzureReceiptOcrService.cs` + `ReceiptsController` | Azure Document Intelligence `prebuilt-receipt`. `POST /api/v1/receipts/scan` multipart, 4MB max, JPG/PNG/HEIC/HEIF/PDF. **Magic bytes signature validation** (sweep 2). Status mapping (401/429/413/400). |
| **Households / Aile** | `Persistence/Services/HouseholdService.cs` | Owner + Admin + Member, invite/accept (token, e-posta), `TransferMode` (None/Move), Hangfire `ExpireOldInvitesAsync`. `CreateAsync` tek transaction'da atomic. Roller yalnız aile yönetimi içindir (veri yetkisi vermez). |
| **Notifications** | `Persistence/Services/NotificationService.cs` + `Infrastructure/Notifications/NotificationDispatcher.cs` | SignalR push + FCM-ready NoOp + DB persist. DedupKey unique constraint. Admin dispatch endpoint. |
| **Dashboard** | `Persistence/Services/DashboardService.cs` | Summary endpoint (monthly aggregates, trend, top categories, upcoming, recent, budget statuses). Aktif scope `txBase`. |
| **Exports (Faz 4)** | `Persistence/Services/ExportService.cs` + `Infrastructure/Reporting/` | V1 aylık özet PDF (QuestPDF Fluent) + V2 işlem listesi Excel (ClosedXML). `POST /api/v1/exports/monthly-pdf` + `transactions-xlsx`, `auth-standard` rate-limit, aktif scope filter, max 12 ay range + 50k row cap. **Interfaces (`IPdfReportGenerator` + `IXlsxReportGenerator`) Application'da** — Persistence Infrastructure'a doğrudan ref vermez. QuestPDF Community license `Program.cs`'te aktif. Plan: `docs/plans/reporting-export-faz4.md`. |

### Migration history (15)

```
20260516155120_InitialCreate
20260516164355_Init_FinanceCore
20260517001956_AddCategoryEmojiAndHouseholdId
20260517072256_AddTransactionPaidViaAndHouseholdId
20260517090848_AddBudgets
20260517120752_AddGoals
20260517120930_SyncGoalModel
20260517124437_AddNotificationsAndDeviceTokens
20260517133704_AddHouseholds
20260517152621_AddDebts
20260517183017_AddDebtLastReminder
20260517191234_AddSharedWithHouseholdId            ← Plan C (sonradan kaldırıldı)
20260518051914_AddHouseholdAndAuditForeignKeys    ← Sweep 2 (8 FK eksiklik tamamlandı)
20260518052836_AddPerfHotPathIndexes              ← Sweep 2 (7 compound + partial index)
20260601121532_RemoveSharedWithHouseholdId        ← Plan C kaldırma (paylaşılan→aile veri taşıma + kolon drop)
```

## i18n disiplini (frontend-bağlantılı)

Backend bildirim mesajları için **key gönderir**, çeviri frontend'de yapılır. `NotificationEnvelope.TitleKey` + `MessageKey` formatı:
- `notif_<domain>_<event>_title` / `notif_<domain>_<event>_body`
- Domain-specific namespace'ler: `notif_household_*` (household.json), `notif_debt_*` (debts.json), diğerleri `notifications.json`

5 dil (TR/EN/AR/ES/DE) tam parity zorunlu — yeni notif key eklenince 5 dile birden eklenmeli, aksi takdirde fallback'a düşer.

## Bilinen sözleşme (kapatılmış denetim bulguları)

- `Microsoft.AspNetCore.Identity 2.3.1` paketi kaldırıldı (CVE NU1903 GHSA-37gx-xxp4-5rgx + GHSA-w3x6-4m5h-cxqf). Yerine `Microsoft.Extensions.Identity.Core 10.0.8` + Persistence/Infrastructure'a `<FrameworkReference Include="Microsoft.AspNetCore.App" />`. **Yeni paket eklerken Identity 2.x'e dönme!**
- AuthController **controller-level** `[EnableRateLimiting("auth-sensitive")]` taşır. `Me` ve `Categories.GetAll` gibi sık çağrılan endpoint'ler için override `auth-standard` veya `api-general`. Sweep 2: 9 protected controller (Budgets, Categories, Dashboard, Debts, Devices, Goals, Notifications, RecurringRules, Transactions) controller-level `api-general` rate-limit'le sarmalıdır.
- Hangfire dashboard `/hangfire` → **Admin role required** (sweep 2'de yetki sıkılaştırıldı; daha önce sadece `IsAuthenticated` idi).
- Auth flow lockout **açık** (5 deneme / 5 dk; `AuthService.LoginAsync` + `AddIdentityCore` Lockout options). Brute-force koruması rate-limiting + lockout iki katmanlı.
- **JWT `RequireHttpsMetadata`**: Development'ta `false`, diğer ortamlarda `true` (MITM koruması, sweep 2).
- **HSTS + güvenlik header'ları** (X-Content-Type-Options/X-Frame-Options/Referrer-Policy/Permissions-Policy) production-only middleware (sweep 2). CSP henüz eklenmedi — dev tool çakışma testi gerek.
- **Reporting (Faz 4) sözleşmesi**: `IPdfReportGenerator` + `IXlsxReportGenerator` interface'leri `Application/Services/Reporting/` altında. Model record'ları (`MonthlyPdfModel`, `CategoryBreakdown`, `TopTransaction`, `TransactionRow`) da Application'da. Infrastructure concrete impl'i (QuestPDF + ClosedXML) bu interface'leri implement eder. ExportService Persistence'ta sadece interface'lere bağlıdır — Clean Architecture katmanları bozulmamış.
- **Secrets**: JWT signing key + SMTP password + Azure DI API key `appsettings.json`'dan ÇIKARILDI (değerler boş); config sağlayıcılarından gelir — dev: `dotnet user-secrets`, prod: env var (`Jwt__SigningKey`, `Smtp__Password`, `AzureDocumentIntelligence__ApiKey`). Detay: [`deploy/SECRETS.md`](../../deploy/SECRETS.md).
