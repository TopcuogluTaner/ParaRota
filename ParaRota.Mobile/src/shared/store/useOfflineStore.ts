import { create } from 'zustand';

/**
 * Ağ durumu — native modül (NetInfo) KULLANMADAN, istek trafiğinden türetilir:
 * httpClient bir ağ hatası (yanıtsız istek) görünce offline'a çeker, herhangi bir
 * başarılı yanıt online'a döndürür. OfflineBanner offline'dayken hafif bir ping ile
 * kurtarmayı yoklar. NetInfo bilinçli tercih edilmedi: native modül OTA ile sahadaki
 * build'lere gidemez (yeni mağaza sürümü isterdi).
 */
interface OfflineState {
  offline: boolean;
  setOffline: (v: boolean) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  offline: false,
  setOffline: (v) => set((s) => (s.offline === v ? s : { offline: v })),
}));
