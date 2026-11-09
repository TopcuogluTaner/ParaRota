import { useMutation, useQuery } from '@tanstack/react-query';
import i18n from '@shared/i18n';
import { aiApi, type VoiceUploadFile } from '@shared/api/endpoints/ai';
import { unwrap } from '@shared/api/unwrap';

export function useParseTransaction() {
  return useMutation({
    mutationFn: (text: string) => unwrap(aiApi.parseTransaction(text, i18n.language)),
  });
}

// Dikte: ses → yazı (Gemini transkripti; kullanıcı kutuda düzenleyip kendisi gönderir).
export function useTranscribeVoice() {
  return useMutation({
    mutationFn: (file: VoiceUploadFile) => unwrap(aiApi.transcribe(file)),
  });
}

// Lazy: kullanıcı "içgörüleri getir" deyince enabled olur; backend 12h önbellekli,
// client tarafında da uzun staleTime ile çift kota koruması.
export function useMonthlyInsightsQuery(month: number, year: number, enabled: boolean) {
  return useQuery({
    queryKey: ['ai', 'insights', month, year, i18n.language],
    queryFn: () => unwrap(aiApi.monthlyInsights(month, year, i18n.language)),
    enabled,
    staleTime: 12 * 60 * 60 * 1000,
    retry: false, // 403/422/429 yeniden denemeyle düzelmez; kota yakmayalım
  });
}
