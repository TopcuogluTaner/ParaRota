# Benchmark Planı — `DashboardService.GetSummaryAsync`

> Backlog görev: **#17 — Dashboard consolidation** (sweep 2'de defer edildi).
> Bu plan, refactor kararı vermeden önce production-benzeri ortamda gerçek p50/p95
> ölçümü için hazırlandı. Bench koşulduktan sonra sonuç raporu
> `docs/benchmarks/dashboard-<YYYY-MM-DD>.md` olarak yan yana eklenir.

## 1. Bağlam — neden bench gerekli

Sweep 2'de eklenen P3.A index migration'ı (`a623ba1`) dashboard'ın 3 büyük query'sini
(`monthAggregates`, `trendRows`, `topCatsRaw`) hedefleyen partial compound index'ler
ekledi. Perf ajanı raporundaki "363ms" tahmini index'siz state'e göreydi.

**Belirsizlik**: Index'lerden sonra endpoint hâlâ yavaş mı? Local DB'de seed veri yok
(3 household, az tx) — meaningful ölçüm yapılamıyor. Yüklü ortamda gerçek p50/p95
görmeden refactor yapmak ROI sallantılı.

## 2. Hedef sorular (bench'in cevap vereceği)

1. Production-benzeri yükte endpoint p50/p95/p99 latency'si ne?
2. Endpoint başına kaç DB roundtrip yapıyor (current: 6 — `monthAggregates`, `trendRows`,
   `topCatsRaw`, `upcomingEntities`, `recentEntities`, `budgetStatuses`)?
3. Hangi query en yavaş? (top kategori? trend? budget?)
4. Refactor seçeneklerinden hangisi gerçekten ROI sağlar?

## 3. Ölçüm metrikleri

| Metrik | Nasıl alınır | Karar için kullanılır |
|---|---|---|
| Endpoint p50/p95/p99 latency | k6 / bombardier output | ana karar eşiği |
| DB roundtrip count | EF Core `LogTo(...)` + log parse | refactor önceliği |
| Per-query latency | PostgreSQL `pg_stat_statements` extension | en yavaş query'i hedefle |
| Index hit ratio | `EXPLAIN ANALYZE` her query üzerinde | seq scan kaldı mı? |
| GC / allocations | `dotnet-counters monitor` | EF tracking yükü |
| Throughput (req/sec) | k6 RPS gauge | concurrent load davranışı |

## 4. Test ortamı — gerekli seed verisi

"1 yıl aktif kullanıcı" senaryosu:

| Tablo | Adet | Notes |
|---|---|---|
| Users | 100 | Test user'lar |
| Households | 30 | Karışık scope için |
| HouseholdMembers | 60 | Avg 2 üye/household |
| Categories | ~500 | 11 sistem + her user için ~5 kişisel |
| Transactions | **600k** | Her user 6k tx (12 ay × 500 tx/ay) |
| Budgets | 600 | Avg 6/user (kategori bazlı) |
| RecurringRules | 300 | Avg 3/user |
| Debts | 300 | Avg 3/user |
| Notifications | 5k | Son 3 ay biriken |

**Seed script konumu**: `ParaRota.Backend/tools/SeedBenchData/` (yeni klasör), idempotent
console app. Realistic dağılım: kategori başına tx sayısı log-normal, tx tarihi son 12 ay
uniform. PostgreSQL `COPY FROM STDIN` ile bulk insert (EF Core SaveChanges 600k row için
çok yavaş — saatler sürer).

## 5. Araçlar

- **k6** (open-source HTTP load test, JS script) — `brew install k6`
- **PostgreSQL `pg_stat_statements`** extension —
  `postgresql.conf`'a `shared_preload_libraries='pg_stat_statements'` ekle,
  restart, `CREATE EXTENSION pg_stat_statements;` çalıştır
- **`dotnet-counters`** — `dotnet tool install --global dotnet-counters`
- **PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`** — query plan deep-dive

## 6. Senaryolar

### A — Soğuk cache, baseline

```
1. docker restart pararota-postgres  (DB cache temizler)
2. dotnet run --project src/External/ParaRota.WebApi
3. 5 sn warmup için tek istek
4. Aynı user için 20 ardışık /api/v1/dashboard/summary
5. İlk 5 isteği drop (JIT/connection pool ısınmıyor)
6. Sonraki 15'in p50 raporla
```

**Cevap verir**: cold latency, ilk istek delay'i.

### B — Sıcak cache, sürekli yük (asıl ölçüm)

```js
// scripts/bench/dashboard-load.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // warmup
    { duration: '60s', target: 10 },  // measure
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
  },
};

const TOKENS = JSON.parse(open('./tokens.json'));  // 100 user JWT

export default function () {
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  http.get('http://localhost:5143/api/v1/dashboard/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

**Cevap verir**: production-benzeri throughput + p50/p95/p99.

### C — Karışık endpoint yükü (gerçekçilik)

```
k6 mix:
  - 50% dashboard
  - 30% transactions list (?page=1&pageSize=50)
  - 15% budgets
  - 5% categories
5 dakika, 20 vUser
```

**Cevap verir**: dashboard endpoint'i diğerleriyle context-switching altında nasıl
davranıyor (connection pool exhaustion, EF Core scoped lifetime impact).

## 7. Karar eşikleri

| Senaryo B p95 | Karar | Aksiyon |
|---|---|---|
| **< 100ms** | Refactor gereksiz | #17'yi `wontfix` kapat, PROGRESS güncelle |
| **100–200ms** | Hafif refactor | Response cache (5s TTL, household-id key) — en düşük risk |
| **200–500ms** | Orta refactor | `IDbContextFactory` + paralel Task; 4 query farklı context'lerde |
| **> 500ms** | Ciddi refactor | Raw SQL CTE (FromSqlRaw) tek round-trip; veya partial CQRS read model |

Per-query `EXPLAIN ANALYZE` çıktısı da karar değiştirir: bir query > 100ms ise spesifik
index/refactor önceliği o query'ye.

## 8. Refactor seçeneklerinin ön-değerlendirmesi

(Bench sonuçları gelince bu tablo doldurularak seçim yapılır.)

| Seçenek | Beklenen kazanç | Risk | Effort |
|---|---|---|---|
| Response cache (`ResponseCaching` middleware) | %50-90 (cache hit) | Stale 5s — bütçe alert için kabul edilebilir mi sorgulanmalı | Düşük (~2sa) |
| IDbContextFactory + `Task.WhenAll` | ~2-3× | DI değişimi 11 servisi etkiler; concurrent context lifecycle | Orta (~4sa) |
| Raw SQL CTE (FromSqlRaw) | ~3-5× | Column rename DB'de patlar; EF tracker kırılır; Plan C `txReporting`/`txBase` ayrımı manuel yazılır | Yüksek (~6sa) |
| Cached read model (Redis / in-memory) | ~10× | Stale window + invalidation karmaşası | Çok yüksek (~12sa+) |

## 9. Çıktı formatı

Rapor dosyası: `docs/benchmarks/dashboard-<YYYY-MM-DD>.md`

İçerik:
- 1 sayfalık özet (eşik vs ölçüm tablosu)
- 3 senaryo için tablo (p50/p95/p99/RPS)
- `pg_stat_statements` top-10
- `EXPLAIN ANALYZE` çıktıları (en yavaş 3 query)
- Karar + sonraki adım
- (Refactor yapılırsa) before/after delta

## 10. Zaman tahmini

| Adım | Süre |
|---|---|
| Seed script yazma + 600k row `COPY FROM` insert | ~2 saat (insert ~5 dk) |
| k6 script + 3 senaryo | ~1 saat |
| Koşturma + log toplama | ~30 dk |
| `pg_stat_statements` + `EXPLAIN` analizi | ~30 dk |
| Rapor yazımı | ~1 saat |
| **Toplam (refactor hariç)** | **~5 saat** |
| Refactor (gerekirse) | 2-12 saat (yukarıdaki tabloya bağlı) |

## 11. Önkoşullar (bench koşmadan önce)

- [ ] `pg_stat_statements` extension yüklü ve enabled
- [ ] k6 kurulu (`brew install k6`)
- [ ] `dotnet-counters` global tool yüklü
- [ ] `ParaRota.Backend/tools/SeedBenchData/` console app yazılmış
- [ ] 100 test user için JWT token cache `tokens.json` üretilmiş
  (login script veya seed sırasında refresh token'larla)
- [ ] `appsettings.Development.json` "Information" log level → EF Core query log
  açık olsun (roundtrip sayımı için)
- [ ] `docker-compose.yml` PostgreSQL volume'ı snapshot'lansın (bench sonrası geri al)

## 12. İlgili dosyalar

- `src/External/ParaRota.Persistence/Services/DashboardService.cs` (24-159) — refactor edilecek method
- `src/External/ParaRota.Persistence/Services/BudgetService.cs:GetStatusForDashboardAsync` — dashboard'dan çağrılan, ayrıca pahalı olabilir
- `src/External/ParaRota.Persistence/Migrations/20260518052836_AddPerfHotPathIndexes.cs` — bench'ten önce uygulanmış olmalı
