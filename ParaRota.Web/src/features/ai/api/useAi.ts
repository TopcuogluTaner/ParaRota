import { useMutation, useQuery } from '@tanstack/react-query';
import i18n from '@shared/i18n';
import { aiApi } from '@shared/api/endpoints/ai';
import { unwrap } from '@shared/api/unwrap';

// ────────────────────────────────────────────────────────────────────────────
// AI hook'ları (premium). Mobil karşılığı: ParaRota.Mobile/src/features/ai/api/useAi.ts
// Her çağrı Gemini kotası yakar — query'ler retry'sız, içgörüler 12 saat stale.
// ────────────────────────────────────────────────────────────────────────────

export function useParseTransaction() {
  return useMutation({
    mutationFn: (text: string) => unwrap(aiApi.parseTransaction(text, i18n.language)),
  });
}

/** Mikrofon kaydı → işlem önerisi (Gemini sesi kendisi çözümler). */
export function useParseVoice() {
  return useMutation({
    mutationFn: ({ file, fileName }: { file: Blob; fileName: string }) =>
      unwrap(aiApi.parseVoice(file, fileName, i18n.language)),
  });
}

/**
 * Lazy: kullanıcı "içgörüleri getir" deyince enabled olur; backend 12h önbellekli,
 * client tarafında da uzun staleTime ile çift kota koruması.
 */
export function useMonthlyInsightsQuery(month: number, year: number, enabled: boolean) {
  return useQuery({
    queryKey: ['ai', 'insights', month, year, i18n.language],
    queryFn: () => unwrap(aiApi.monthlyInsights(month, year, i18n.language)),
    enabled,
    staleTime: 12 * 60 * 60 * 1000,
    retry: false, // 403/422/429 yeniden denemeyle düzelmez; kota yakmayalım
  });
}
