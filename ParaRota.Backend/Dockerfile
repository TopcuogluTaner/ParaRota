# ParaRota.Backend — .NET 10 Web API (multi-arch; ARM64 VM'de native derlenir)
# Build context: ParaRota.Backend/

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Önce sadece proje dosyalarını kopyala → restore katmanı cache'lensin
COPY src/Core/ParaRota.Domain/ParaRota.Domain.csproj                 src/Core/ParaRota.Domain/
COPY src/Core/ParaRota.Application/ParaRota.Application.csproj        src/Core/ParaRota.Application/
COPY src/External/ParaRota.Persistence/ParaRota.Persistence.csproj   src/External/ParaRota.Persistence/
COPY src/External/ParaRota.Infrastructure/ParaRota.Infrastructure.csproj src/External/ParaRota.Infrastructure/
COPY src/External/ParaRota.Presentation/ParaRota.Presentation.csproj src/External/ParaRota.Presentation/
COPY src/External/ParaRota.WebApi/ParaRota.WebApi.csproj             src/External/ParaRota.WebApi/

RUN dotnet restore src/External/ParaRota.WebApi/ParaRota.WebApi.csproj

# Geri kalan kaynağı kopyala ve publish et
COPY src/ src/
# -m:1 → tek thread; paralel build'de MSBuild resource-generation yarışını (MSB3552) önler
RUN dotnet publish src/External/ParaRota.WebApi/ParaRota.WebApi.csproj \
    -c Release -o /app/publish --no-restore -m:1 /p:UseAppHost=false

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# .NET 8+ runtime image'ında hazır gelen non-root 'app' kullanıcısı (UID 1654)
USER app

COPY --from=build /app/publish .

# Container içi HTTP portu (Nginx buraya proxy'ler)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ParaRota.WebApi.dll"]
