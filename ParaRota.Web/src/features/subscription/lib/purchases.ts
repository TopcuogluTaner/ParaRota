import {
  Purchases,
  PackageType,
  type CustomerInfo,
  type Offering,
  type Package,
} from '@revenuecat/purchases-js';

// RevenueCat entitlement kimliği — backend ile sözleşme (her zaman 'premium').
export const PREMIUM_ENTITLEMENT = 'premium';

let currentUserId: string | null = null;

/**
 * RevenueCat Web Billing SDK'yı yapılandır / kullanıcıyı bağla.
 * App User ID = bizim backend userId'miz → mobil ile TAM tutarlılık.
 * Aynı kullanıcı için tekrar çağrı no-op; kullanıcı değişince changeUser.
 * Key boşsa sessizce no-op (paywall satın alma pasifleşir).
 */
export async function configurePurchases(apiKey: string | null, appUserId: string): Promise<void> {
  if (!apiKey) return;
  try {
    if (!Purchases.isConfigured()) {
      Purchases.configure(apiKey, appUserId);
      currentUserId = appUserId;
      return;
    }
    if (currentUserId !== appUserId) {
      await Purchases.getSharedInstance().changeUser(appUserId);
      currentUserId = appUserId;
    }
  } catch (err) {
    console.warn('[purchases] configure başarısız:', err);
  }
}

export function isPurchasesConfigured(): boolean {
  try {
    return Purchases.isConfigured();
  } catch {
    return false;
  }
}

/** Mevcut offering (Aylık/Yıllık paketler). Yoksa null. */
export async function getCurrentOffering(): Promise<Offering | null> {
  if (!isPurchasesConfigured()) return null;
  const offerings = await Purchases.getSharedInstance().getOfferings();
  return offerings.current ?? null;
}

/** Bir paketi satın al (Web Billing hosted checkout) → güncel customerInfo. */
export async function purchasePackage(pkg: Package, customerEmail?: string): Promise<CustomerInfo> {
  const result = await Purchases.getSharedInstance().purchasePackage(pkg, customerEmail);
  return result.customerInfo;
}

/** Güncel customerInfo (anlık entitlement durumu). */
export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isPurchasesConfigured()) return null;
  return Purchases.getSharedInstance().getCustomerInfo();
}

/** customerInfo içinde 'premium' entitlement aktif mi. */
export function hasActivePremium(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[PREMIUM_ENTITLEMENT];
}

/** Paketin fiyat etiketi (formatlı). */
export function packagePrice(pkg: Package): string {
  return pkg.webBillingProduct?.currentPrice?.formattedPrice
    ?? pkg.rcBillingProduct?.currentPrice?.formattedPrice
    ?? '';
}

/** Paket yıllık mı (varsayılan seçim + 'en iyi değer' rozeti için). */
export function isAnnualPackage(pkg: Package): boolean {
  return pkg.packageType === PackageType.Annual || /annual|year/i.test(pkg.identifier);
}

export type { CustomerInfo, Offering, Package };
