# ParaRota.Web

ParaRota'nın React 19 + Vite + TypeScript frontend'i. 5 dil destekli (TR/EN/AR/ES/DE), MUI v7 + TanStack Query + Zustand.

## Hızlı başlangıç

```bash
npm install
npm run dev        # → http://localhost:5173
```

Backend de ayakta olmalı (`http://localhost:5143`); değilse [`ParaRota.Backend/README.md`](../ParaRota.Backend/README.md).

## Scripts

```bash
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run i18n:check   # 5 dil × namespace key parity (CLDR plural-aware)
npm run preview      # built bundle preview
```

## Proje yapısı

```
src/
├── app/
│   ├── App.tsx                — ErrorBoundary + AppProviders + AppShell + AppRouter
│   ├── layouts/               — MainLayout, AuthLayout, Sidebar
│   ├── providers/             — TanStack Query, theme, SignalR, ...
│   └── routes/                — AppRouter, ProtectedRoute, AdminRoute
├── features/                  — domain-bazlı feature klasörleri
│   ├── auth/                  — login, register, refresh
│   ├── transactions/          — list + form modal + OCR entegrasyonu (QuickEntryModal)
│   ├── categories/            — IconPicker + form modal (3-dosya pattern)
│   ├── budgets/               — slider + preview kart
│   ├── recurring/             — frequency picker + autoApprove
│   ├── goals/                 — priority + status
│   ├── debts/                 — payment modal + Auto/Manual mode segment
│   ├── household/             — chip switcher + members + invites (HouseholdPage)
│   ├── dashboard/             — widget'lar (useDashboardSummaryQuery)
│   ├── notifications/         — list + admin SendNotificationForm
│   ├── receipts/              — OCR scan hook (Azure DI)
│   ├── exports/               — Faz 4: PDF + Excel indirme (Monthly + Transactions modal'ları)
│   ├── admin/                 — admin paneli
│   ├── profile/ + settings/   — kullanıcı ayarları
├── shared/
│   ├── api/                   — axios httpClient (token + refresh interceptor + X-Active-Household-Id), endpoints, types
│   ├── components/            — ZoomModal, SurfaceCard, SectionHeader, ScopeIndicator, ConfirmDialog, ErrorBoundary, EmptyState, ...
│   ├── constants/             — currencies
│   ├── hooks/                 — useApiHandler, ...
│   ├── i18n/                  — i18next setup + 5 dil locale dosyaları
│   ├── lib/                   — parseAmount, getErrorMessage, dateFormat, signalrClient, notificationBus, sweetAlert, ...
│   ├── store/                 — useConfigStore (Zustand)
│   ├── theme/                 — MUI theme (RTL Arapça desteği)
│   └── utils/                 — küçük helper'lar
└── main.tsx
```

## Mimari sözleşmeler

- **Feature-based folder** — `features/<domain>/{api,components,hooks,pages,store,types}`. Cross-cutting şeyler `shared/`'da.
- **API katmanı** — `shared/api/endpoints/<x>.ts` axios endpoint'leri, feature'lar TanStack Query hook'larıyla sarmal (`features/<x>/api/useXxx.ts`).
- **Form decomposition pattern** (büyük form modal'ları için 3-dosya):
  - `useXxxFormState.ts` — state + setter + derived values + validate
  - `XxxFormFields.tsx` — pure UI render + yerel sub-component'ler
  - `XxxFormModal.tsx` — orchestrator (mutation handlers + submit + ZoomModal)
  - Örnek: `features/debts/components/{useDebtFormState, DebtFormFields, DebtFormModal}.tsx`
- **Household scope** — `useActiveHouseholdStore` (Zustand persist) + axios interceptor `X-Active-Household-Id` header'ı + queryClient `invalidateQueries()` subscribe-on-change.
- **Plan C uyumu** — form modal'larında **ScopeIndicator** komponenti zorunlu (kayıt hangi scope'a gidiyor).
- **Destructive aksiyonlar** — **ConfirmDialog** zorunlu (silme, transfer owner, leave household).
- **Shared util'ler** — duplicate kod yerine `shared/lib/parseAmount.ts`, `shared/lib/getErrorMessage.ts`, `shared/constants/currencies.ts`.
- **Error handling** — `try/catch` + `toast.error(getErrorMessage(err, fallback))`.
- **Blob download** (Exports) — `URL.createObjectURL` + anchor `.click()` + `revokeObjectURL`.

## i18n disiplin

- 5 dil (TR/EN/AR/ES/DE) tam parity zorunlu. Yeni key eklenince 5 dile birden eklenmeli.
- **`npm run i18n:check`** — CLDR plural suffix'lerini (`_zero/_two/_few/_many`) canonical `_other`'a indirgeyerek karşılaştırır (Arapça'da fazla plural form'lar yanlışlıkla "drift" olarak raporlanmasın).
- Namespace listesi: `common`, `auth`, `navigation`, `dashboard`, `pages`, `mocks`, `notifications`, `household`, `debts`, `exports`.

## State management

- **TanStack Query v5** — server state (cache + invalidation + mutation). `staleTime: 15s` global (sweep 2'de 30s'den düşürüldü). Hash key pattern: `[entity, scope, filter]`.
- **Zustand** — client-only state (auth, active household, config, theme). Persisted store'lar (`useAuthStore`, `useActiveHouseholdStore`) version+migrate ile sweep 2'de sertleştirildi.

## Auth flow

- Login → axios interceptor `Authorization: Bearer` header'ı + cookie persist (`js-cookie`).
- 401 → axios response interceptor refresh-token endpoint'ini çağırır, başarılıysa originalRequest retry.
- Logout → `queryClient.clear()` + `useActiveHouseholdStore.setActive(null)` + cookie'leri sil (sweep 2 hardening).
- Admin route guard — `AdminRoute` wrapper (router seviyesinde defense-in-depth, AdminPage içindeki kontrol kalsa da).

## Faz 4 — Exports

Sidebar'da "Dışa Aktar" menüsü → `/exports` sayfası.

- **Monthly PDF** — ay/yıl seç → backend QuestPDF Fluent template → A4 PDF indir.
- **Transactions Excel** — tarih aralığı + tip + kategori filter → backend ClosedXML → autofilter'lı .xlsx indir.

Plan: [`../docs/plans/reporting-export-faz4.md`](../docs/plans/reporting-export-faz4.md).

## Build artifact

- Vite production bundle code-splitting:
  - `react-vendor` (react + react-dom + react-router + scheduler)
  - `mui` (@mui/material + @mui/icons-material)
  - `i18n` (react-i18next + i18next + dependencies)
  - `tanstack` (@tanstack/react-query)
- Toplam main chunk ~500 KB minified (sweep 2'de optimize edildi).

## Üst-seviye dokümantasyon

- [`../README.md`](../README.md) — proje genel rehberi
- [`../ParaRota.Backend/CLAUDE.md`](../ParaRota.Backend/CLAUDE.md) — backend mimari + sözleşmeler
