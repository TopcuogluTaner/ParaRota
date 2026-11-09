# ParaRota.Backend

ParaRota uygulamasının yeni .NET 10 + PostgreSQL Clean Architecture backend'i.

## Hızlı Başlangıç

```bash
docker compose up -d                                    # Postgres'i ayağa kaldır
dotnet build ParaRota.Backend.sln                       # Derle
dotnet run --project src/External/ParaRota.WebApi       # Çalıştır
```

Çalışınca:
- Swagger: `https://localhost:{port}/swagger`
- Auth endpoint'leri: `/api/v1/auth/...`

## Proje Yapısı

```
ParaRota.Backend/
├── ParaRota.Backend.sln
├── docker-compose.yml
├── src/
│   ├── Core/
│   │   ├── ParaRota.Domain          # Entities, Abstractions, DTOs (ApiResponse, PagedResponse)
│   │   └── ParaRota.Application     # MediatR Features, DTOs, ValidationBehavior, AutoMapper
│   └── External/
│       ├── ParaRota.Persistence     # AppDbContext (Identity + soft delete + audit), Repos, AuthService
│       ├── ParaRota.Infrastructure  # JwtProvider, SmtpMailService, CurrentUserService
│       ├── ParaRota.Presentation    # ApiController, AuthController
│       └── ParaRota.WebApi          # Program.cs (minimal) + IServiceInstaller pattern
└── tests/
    └── ParaRota.UnitTest
```

## Migrations

```bash
# Ekle
dotnet ef migrations add <Name> \
  --project src/External/ParaRota.Persistence \
  --startup-project src/External/ParaRota.WebApi

# Uygula (uygulama zaten başlangıçta MigrateAsync çağırıyor)
dotnet ef database update \
  --project src/External/ParaRota.Persistence \
  --startup-project src/External/ParaRota.WebApi
```

## Konfigürasyon

`appsettings.json` env-keyed: `AppSettings:Environment` (TEST/PROD) ile `EnvConfig:{ENV}:ConnectionStrings:DefaultConnection` okunur.

Yerel override için `appsettings.Local.json` kullanabilirsin — `.gitignore`'a eklendi.
