import { Easing } from 'react-native-reanimated';

// Hareket token'ları — Emil Kowalski'nin design-engineering ilkeleri (animations.dev).
// Yerleşik easing'ler "zayıf" kalır; güçlü özel eğriler kullan. UI animasyonları <300ms.
export const motion = {
  easing: {
    out: Easing.bezier(0.23, 1, 0.32, 1),    // güçlü ease-out — giriş/çıkış + basınç geri-bildirimi
    inOut: Easing.bezier(0.77, 0, 0.175, 1),  // ekran-içi hareket/morph
    drawer: Easing.bezier(0.32, 0.72, 0, 1),  // iOS drawer eğrisi (Ionic)
  },
  duration: {
    press: 140,   // buton/kart basınç geri-bildirimi (100-160ms)
    fast: 180,    // tooltip/küçük popover
    base: 240,    // dropdown/select/giriş
    modal: 320,   // modal/drawer
  },
  // Apple yaklaşımı: yumuşak yay (bounce'u 0.1-0.3 arası tut; çoğu UI'da bounce'tan kaçın).
  spring: {
    soft: { damping: 22, stiffness: 220, mass: 1 },
    bouncy: { damping: 14, stiffness: 200, mass: 1 },
  },
} as const;
