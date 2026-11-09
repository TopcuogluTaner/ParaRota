# Mobil Google girişi + EAS dev build — kurulum

Web Google girişi canlı. Mobil Google için (Expo Go yetmez; SDK 54 proxy yok → **dev build** şart):

## 1) Google Cloud Console — iOS + Android OAuth Client ID
APIs & Services → Credentials → **Create OAuth client ID**:
- **iOS** · Bundle ID: `com.pararotam.mobile` → Client ID'yi al (`...apps.googleusercontent.com`)
- **Android** · Package: `com.pararotam.mobile` · **SHA-1**: `eas credentials` (Android) çıktısından (build sırasında üretilir) → Client ID'yi al

## 2) app.json — client ID'leri + iOS URL scheme
`expo.extra` içine (Web zaten dolu):
```json
"googleIosClientId": "<IOS_CLIENT_ID>.apps.googleusercontent.com",
"googleAndroidClientId": "<ANDROID_CLIENT_ID>.apps.googleusercontent.com"
```
iOS için ayrıca **reversed client ID** URL scheme'i gerekir (`expo.ios.infoPlist`):
```json
"CFBundleURLTypes": [
  { "CFBundleURLSchemes": ["com.googleusercontent.apps.<IOS_CLIENT_ID>"] }
]
```
(`com.googleusercontent.apps.` + iOS client ID'nin baş kısmı — Google konsolundaki iOS client'ta "iOS URL scheme" olarak yazar.)

## 3) Backend — yeni client ID'leri audience'a ekle
`appsettings.json` → `GoogleAuth:ClientIds` listesine iOS + Android client ID'lerini ekle (commit + push → otomatik deploy). Mobil id_token'ın `aud`'u bu ID olacağından doğrulama için şart.

## 4) EAS dev build
```bash
cd ParaRota.Mobile
npm i -g eas-cli         # (yoksa)
eas login                # Expo hesabı (interaktif — sen yapmalısın)
eas init                 # projectId üretir → app.json extra.eas.projectId
eas build --profile development --platform ios      # veya android
```
- `eas.json` profilleri hazır (development = developmentClient + internal dağıtım).
- Build bitince QR ile cihaza kur; Metro'yu `npx expo start --dev-client` ile bağla.
- Dev client'ta `GOOGLE_LOGIN_AVAILABLE` true olur (native client ID + reversed scheme var) → "Google ile devam et" butonu görünür ve çalışır.

## Notlar
- Buton `GOOGLE_LOGIN_AVAILABLE` ile gate'li: platform client ID yoksa hiç render edilmez (Expo Go'da crash olmaz).
- Apple Sign In de bu noktada eklenebilir (Service ID + key + `expo-apple-authentication` + backend `/auth/apple`).
