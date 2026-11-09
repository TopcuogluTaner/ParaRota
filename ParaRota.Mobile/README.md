# ParaRota.Mobile

ParaRota'nın React Native (Expo SDK 54) + Expo Router + React Native Paper Material 3 mobil uygulaması. Web'in tüm modüllerinin (admin paneli hariç) fonksiyonel paritesi hedeflenir.

## Hızlı başlangıç

```bash
npm install
npx expo start
```

Backend de ayakta olmalı (`http://localhost:5143`). Fiziksel cihaz Expo Go ile kullanılacaksa `app.json` → `extra.apiBaseUrl`'ı LAN IP'sine değiştirin.

## Scripts

```bash
npm run start                # expo start (QR + Expo Go / dev client)
npm run android              # expo start --android
npm run ios                  # expo start --ios
npm run web                  # expo start --web
npm run typecheck            # tsc --noEmit
```

## Kapsamlı feature listesi

| Modül | Durum | Notlar |
|---|---|---|
| Auth (login/register/forgot/reset/verify) | ✅ | SecureStore token persist + 401 refresh |
| Dashboard | ✅ | 5 kart: net, top kategoriler, budgets, upcoming, recent |
| Transactions | ✅ | Searchbar + tip filter + form modal + **OCR fişten doldur** |
| Categories | ✅ | IconPicker (60+ MaterialCommunityIcons) + form modal |
| Budgets | ✅ | Aylık liste + alert seviyesi renkleri + form modal |
| Recurring | ✅ | Run-now butonu + frequency picker + auto-approve |
| Goals | ✅ | Priority + status segmented + emoji + targetDate |
| Debts | ✅ | Payable/receivable + Auto/Manual mode + DebtPaymentModal |
| Household | ✅ | Multi-household chip + invite form + members + role menu + leave dialog + **Plan C TransferMode 3-radio** |
| Notifications | ✅ | SignalR + Expo Push + payload-aware i18n |
| Exports | ✅ | Monthly PDF + Transactions XLSX → expo-file-system + Sharing |
| Profile / Settings / More | ✅ | Change password + language + theme (light/dark/system) |
| Admin | ❌ | Mobilde yok (web-only) |

## Stack

- **React Native 0.81.5** + **Expo SDK 54** (newArch enabled)
- **Expo Router 6** (file-based routing, typed routes)
- **React Native Paper 5** (Material 3) + **MaterialCommunityIcons** (Paper içerikli)
- **TanStack Query v5** (server state)
- **Zustand 5** (client state, AsyncStorage persist)
- **axios** (HTTP) + **@microsoft/signalr** (realtime)
- **i18next** + **expo-localization** (5 dil)
- **expo-secure-store** (token), **expo-notifications** (push), **expo-image-picker** (OCR), **expo-file-system + expo-sharing** (export download), **expo-linking** (deep link)

Bağımlılıklar ve sürümler için `package.json`.

## Proje yapısı

```
app/                           # Expo Router routes
src/
├── features/                  # 14 feature klasörü
└── shared/
    ├── api/                   # httpClient + endpoints + types
    ├── components/            # AppHeader, ConfirmDialog, ScopeIndicator, ...
    ├── i18n/locales/{tr,en,ar,es,de}/*.json
    ├── lib/                   # tokenStorage, signalrClient, notificationBus, ...
    ├── store/                 # active household, theme
    └── theme/                 # MD3 light/dark
```

Detaylı mimari rehberi için [`CLAUDE.md`](./CLAUDE.md).

## Üst-seviye dokümantasyon

- [`../README.md`](../README.md) — proje genel rehberi
- [`../ParaRota.Backend/CLAUDE.md`](../ParaRota.Backend/CLAUDE.md) — backend mimari
- [`../ParaRota.Web/README.md`](../ParaRota.Web/README.md) — web frontend rehberi
