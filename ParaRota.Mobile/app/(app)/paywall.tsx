import { useLocalSearchParams } from 'expo-router';
import { PaywallScreen } from '@features/subscription/components/PaywallScreen';
import type { PremiumFeature } from '@features/subscription/lib/paywallNav';

export default function PaywallRoute() {
  const { feature } = useLocalSearchParams<{ feature?: PremiumFeature }>();
  return <PaywallScreen feature={feature ?? 'generic'} />;
}
