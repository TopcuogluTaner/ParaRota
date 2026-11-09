import { useAuthStore } from '@features/auth/store/useAuthStore';

export interface Entitlement {
  /** Premium erişimi açık mı (sunucu = yetkili kaynak; /auth/me isPremium). */
  isPremium: boolean;
  /** 30g uygulama denemesi sürüyor mu (abonelik olmadan). */
  isInTrial: boolean;
  /** Denemenin bitişine kalan gün (yoksa null). */
  trialDaysLeft: number | null;
  trialEndsAt: Date | null;
  premiumExpiresAt: Date | null;
  plan: string | null;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Premium yetki durumu. Otorite backend `/auth/me` isPremium'dur (UI'a güvenmeyiz).
 * Satın alma/restore sonrası `useAuthStore.fetchUser()` ile tazelenir.
 */
export function useEntitlement(): Entitlement {
  const user = useAuthStore((s) => s.user);

  return {
    isPremium: !!user?.isPremium,
    isInTrial: !!user?.isInTrial,
    trialDaysLeft: daysUntil(user?.trialEndsAt ?? null),
    trialEndsAt: user?.trialEndsAt ? new Date(user.trialEndsAt) : null,
    premiumExpiresAt: user?.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null,
    plan: user?.plan ?? null,
  };
}
