import { create } from 'zustand';

export type PremiumFeature = 'investments' | 'receipts' | 'household' | 'ai' | 'generic';

interface PaywallState {
  open: boolean;
  feature: PremiumFeature;
  show: (feature?: PremiumFeature) => void;
  hide: () => void;
}

/** Global paywall dialog durumu — `<PaywallDialog />` MainLayout'ta bir kez mount edilir. */
export const usePaywallStore = create<PaywallState>((set) => ({
  open: false,
  feature: 'generic',
  show: (feature = 'generic') => set({ open: true, feature }),
  hide: () => set({ open: false }),
}));
