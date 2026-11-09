import { AcceptInviteScreen } from '@features/household/pages/AcceptInviteScreen';
import { PremiumGate } from '@features/subscription/components/PremiumGate';

// Çift taraflı premium kuralı: daveti kabul etmek de premium gerektirir
// (backend accept-invite ucu [RequirePremium] ile korur, burası UX katmanı).
export default function AcceptInviteRoute() {
  return (
    <PremiumGate feature="household" back>
      <AcceptInviteScreen />
    </PremiumGate>
  );
}
