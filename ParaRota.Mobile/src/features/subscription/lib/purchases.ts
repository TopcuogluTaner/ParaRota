import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@shared/lib/appConfig';

// RevenueCat entitlement kimliği — backend ile sözleşme (her zaman 'premium').
export const PREMIUM_ENTITLEMENT = 'premium';

const apiKey = Platform.select({
  ios: REVENUECAT_IOS_KEY,
  android: REVENUECAT_ANDROID_KEY,
  default: '',
});

let configured = false;

/** API key tanımlı mı (paywall satın alma akışı aktif edilebilir mi). */
export function isPurchasesAvailable(): boolean {
  return !!apiKey;
}

/**
 * RevenueCat SDK'yı başlat. Native modül yoksa (Expo Go / native build alınmamış)
 * veya key boşsa sessizce no-op — uygulama çökmez, paywall pasifleşir.
 * `appUserId` verilirse RevenueCat App User ID = bizim kullanıcı ID'miz olur.
 */
export function configurePurchases(appUserId?: string): void {
  if (configured || !apiKey) return;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey, appUserID: appUserId ?? null });
    configured = true;
  } catch (err) {
    if (__DEV__) console.warn('[purchases] configure başarısız (native modül yok olabilir):', err);
  }
}

/** Girişte çağrılır: RevenueCat App User ID'yi bizim backend userId'mize bağlar. */
export async function loginPurchases(appUserId: string): Promise<void> {
  if (!configured || !apiKey) return;
  try {
    await Purchases.logIn(appUserId);
  } catch (err) {
    if (__DEV__) console.warn('[purchases] logIn başarısız:', err);
  }
}

/** Çıkışta çağrılır: anonim kullanıcıya döner. */
export async function logoutPurchases(): Promise<void> {
  if (!configured || !apiKey) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    if (__DEV__) console.warn('[purchases] logOut başarısız:', err);
  }
}

/** Mevcut offering (Aylık/Yıllık paketler). Yoksa null. */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured || !apiKey) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/** Bir paketi satın al → güncel customerInfo. SDK yoksa null (no-op). */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (!configured || !apiKey) return null;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/** Geçmiş satın alımları geri yükle (Apple zorunlu) → customerInfo. SDK yoksa null (no-op). */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured || !apiKey) return null;
  return Purchases.restorePurchases();
}

/** customerInfo içinde 'premium' entitlement aktif mi (anlık UX için). */
export function hasActivePremium(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[PREMIUM_ENTITLEMENT];
}

export type { CustomerInfo, PurchasesOffering, PurchasesPackage };
