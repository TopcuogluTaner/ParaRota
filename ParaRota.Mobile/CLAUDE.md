# ParaRota.Mobile — Claude rehberi

ParaRota'nın React Native (Expo SDK 54) + Expo Router + React Native Paper Material 3 mobil uygulaması. Web'in (admin paneli hariç) fonksiyonel paritesi hedeflenir.

> **Expo değişti** — kod yazmadan önce sürüm spesifik docs'a bak: https://docs.expo.dev/versions/v54.0.0/

## Hızlı başlangıç

```bash
cd ParaRota.Mobile
npm install
npx expo start             # QR + Expo Go / dev client
# Backend dev server da ayakta olmalı: http://localhost:5143
```

Eğer cihazınızdan localhost'a erişim için Expo Go kullanıyorsanız, `app.json` → `extra.apiBaseUrl`'ı LAN IP'sine işaret edecek şekilde override edin (ör. `http://192.168.1.10:5143/api/v1`).

## Proje yapısı

```
ParaRota.Mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # root: providers + hydrate token/i18n + fetchUser
│   ├── index.tsx                 # auth check → redirect
│   ├── (auth)/                   # login / register / forgot / reset / verify
│   └── (app)/                    # protected
│       ├── _layout.tsx
│       ├── (tabs)/               # Dashboard / Transactions / Budgets / More
│       └── categories.tsx + recurring.tsx + goals.tsx + debts.tsx +
│           household.tsx + notifications.tsx + exports.tsx +
│           profile.tsx + settings.tsx + accept-invite.tsx
├── src/
│   ├── features/                 # feature klasörleri (api + components + pages)
│   │   ├── auth (store + api + 5 sayfa)
│   │   ├── dashboard, transactions, categories, budgets, recurring,
│   │       goals, debts, household, notifications, receipts, exports,
│   │       profile, settings
│   └── shared/
│       ├── api/                  # httpClient + queryClient + endpoints + types
│       ├── components/           # AppHeader, ConfirmDialog, ScopeIndicator,
│       │                         # EmptyState, LoadingScreen, SurfaceCard,
│       │                         # SectionHeader, ScreenContainer, ToastHost,
│       │                         # CategoryIconPicker
│       ├── constants/currencies.ts
│       ├── i18n/                 # 5 dil × 10 namespace + expo-localization detector
│       ├── lib/                  # tokenStorage (SecureStore), signalrClient,
│       │                         # notificationBus, expoPush, toast,
│       │                         # parseAmount, dateFormat, getErrorMessage
│       ├── store/                # useActiveHouseholdStore, useThemeStore
│       ├── theme/                # MD3 light/dark + system
│       └── types/                # ApiResponse + PagedResponse
└── app.json, babel.config.js, metro.config.js, tsconfig.json
```

## Mimari sözleşmeler

- **Auth state** — `useAuthStore` (Zustand, persistent değil; tokenlar SecureStore'da, kullanıcı bilgisi her açılışta `/auth/me` ile tazelenir).
- **Token persist** — `expo-secure-store` üzerinden `pararota.access` + `pararota.refresh`. `hydrateTokens()` app boot'unda çağrılır.
- **API client** — axios + interceptor: `Authorization: Bearer` + `X-Active-Household-Id`; 401'de refresh-token endpoint'i + retry.
- **Active household scope** — `useActiveHouseholdStore` (AsyncStorage persist); değişimde `queryClient.invalidateQueries()` (queryClient.ts içinde subscribe).
- **i18n** — `initI18n()` boot sırasında çağrılır; AsyncStorage'tan `pararota.lang`, yoksa `expo-localization` detector.
- **Theme** — `useThemeStore` mode (`light`/`dark`/`system`); system mode'da `useColorScheme()` ile RN'nin Appearance API'sini takip eder.
- **SignalR** — `startSignalR()` access token'ı SecureStore'dan accessTokenFactory ile çeker; reconnect [0,2s,5s,10s,30s].
- **Push** — `expo-notifications` permission + `getExpoPushTokenAsync` → backend `POST /devices/register` (platform: ios/android).
- **Notification bus** — `notificationBus.ts` tek noktadan SignalR + foreground push'u dinler, query cache'i invalidate eder, Snackbar gösterir.
- **Plan C scope** — form modal'larında `ScopeIndicator` zorunlu; destructive aksiyonlarda `ConfirmDialog` zorunlu. (Web sözleşmesi ile birebir.)
- **Form pattern** — küçük modal'lar tek dosya; 3-dosya pattern (useXxxFormState + XxxFormFields + XxxFormModal) Web'deki gibi gerekirse uygulanır. Şu an mobil modallar tek dosyada, ileride büyürse decompose edilebilir.
- **Exports** — backend `arraybuffer` → `base64` → `expo-file-system/legacy` cacheDirectory + `expo-sharing` shareAsync (Blob/createObjectURL yok).
- **Receipts/OCR** — `expo-image-picker.launchImageLibraryAsync` → `{uri, name, type}` → FormData → backend `/receipts/scan`. Pre-fill kullanıcı verisini ezmez, notes append edilir.

## Routing

- **Tabs**: Dashboard (`/`), Transactions, Budgets, More.
- **Stack screens** (Tab dışı): categories, recurring, goals, debts, household, notifications, exports, profile, settings, accept-invite.
- **Auth flow** layout grup'u (`(auth)`); login olmadan `(app)`'a erişim engelli.
- **Deep linking** — scheme `pararota://`. Davet kabul: `pararota://(app)/accept-invite?token=XYZ`.

## i18n

- 5 dil: TR/EN/AR/ES/DE — Web ile birebir paritede (10 namespace × 5 dil).
- Yeni key eklerseniz 5 dile birden ekleyin (Web'in `npm run i18n:check`'i tarafından `ParaRota.Web/scripts/i18n-parity-check.mjs` ile doğrulanır — JSON dosyaları Web ile paylaşımlı kaynak olabilir gelecekte).
- RTL Arapça için `RTL_LANGS` listesi; ileride `I18nManager.forceRTL` ile bağlanabilir (şu an Paper otomatik kullanır).

## Yapı kararları (Sonraki seans)

- Bottom-sheet alternatifi `@gorhom/bottom-sheet` kurulu; Paper Modal'ın iyi gelmediği yerlerde devreye alınabilir.
- `react-native-keyboard-aware-scroll-view` form modal'larda klavye taşmasını engellemek için hazır.
- Charts henüz yok — Dashboard widget'larında progress bar + raw numbers kullanılıyor. İleride `victory-native` veya `react-native-svg-charts` eklenebilir.
- EAS Build / OTA: `app.json` slug + bundleIdentifier hazır; `eas init` ile devam edilebilir.

## Build / typecheck

```bash
npx tsc --noEmit              # ✅ 0 hata (2026-05-18)
npx expo start                # Metro dev server
npx expo prebuild             # native projeleri üret (EAS bare modu)
```
