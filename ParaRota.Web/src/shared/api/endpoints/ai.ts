import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { MonthlyInsightsDto, ParsedTransactionDto } from '../types/ai';

const BASE = '/ai';

// ────────────────────────────────────────────────────────────────────────────
// AI asistanı (premium — backend [RequirePremium], her çağrı Gemini kotası yakar).
// UI çağırmadan ÖNCE useEntitlement ile gate'ler; 403 PREMIUM_REQUIRED yine de
// resolveApiError üzerinden okunabilir mesaja düşer.
// ────────────────────────────────────────────────────────────────────────────
export const aiApi = {
  /** Serbest metin → işlem önerisi (form ön doldurma). */
  parseTransaction: (text: string, language?: string) =>
    http.post<ApiResponse<ParsedTransactionDto>>(`${BASE}/parse-transaction`, { text, language }),

  /**
   * Ses kaydı → işlem önerisi. Backend mime'ı Gemini'ye normalize eder:
   * wav/mp3/ogg/flac aynen geçer, diğer her şey (audio/mp4 dahil) audio/aac sayılır.
   * Tarayıcıdan yalnız bu kümeye düşen kayıtları gönder (bkz. QuickEntryModal pickAudioMime).
   */
  parseVoice: (file: Blob, fileName: string, language?: string) => {
    const formData = new FormData();
    formData.append('file', file, fileName);
    if (language) formData.append('language', language);
    return http.post<ApiResponse<ParsedTransactionDto>>(`${BASE}/parse-voice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Aylık AI içgörüleri (aktif scope; sunucuda 12 saat önbellekli). */
  monthlyInsights: (month: number, year: number, language?: string) =>
    http.get<ApiResponse<MonthlyInsightsDto>>(`${BASE}/insights/monthly`, {
      params: { month, year, language },
    }),
};
