import { HouseholdScreen } from '@features/household/pages/HouseholdScreen';
import { HouseholdLockedScreen } from '@features/household/pages/HouseholdLockedScreen';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';

// PremiumGate yerine özel kapı: premium'suz kullanıcı paywall'ı görür AMA
// üyeliklerini listeleyip aileden AYRILABİLİR (Leave premium gerektirmez;
// aksi halde premium'u biten üye ayrılma akışına hiç ulaşamıyordu).
export default function HouseholdRoute() {
  const { isPremium } = useEntitlement();
  return isPremium ? <HouseholdScreen /> : <HouseholdLockedScreen />;
}
