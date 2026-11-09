import { InvestmentsScreen } from '@features/investments/pages/InvestmentsScreen';
import { PremiumGate } from '@features/subscription/components/PremiumGate';

export default function InvestmentsRoute() {
  return (
    <PremiumGate feature="investments" back>
      <InvestmentsScreen />
    </PremiumGate>
  );
}
