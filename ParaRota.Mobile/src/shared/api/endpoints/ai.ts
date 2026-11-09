import { http } from '../httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type { MonthlyInsightsDto, ParsedTransactionDto } from '../types';

export interface VoiceUploadFile {
  uri: string;
  name: string;
  type: string;
}

export const aiApi = {
  parseTransaction: (text: string, language?: string) =>
    http.post<ApiResponse<ParsedTransactionDto>>('/ai/parse-transaction', { text, language }),
  parseVoice: (file: VoiceUploadFile, language?: string) => {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    if (language) formData.append('language', language);
    return http.post<ApiResponse<ParsedTransactionDto>>('/ai/parse-voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Dikte: ses → düz yazı.
  transcribe: (file: VoiceUploadFile) => {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    return http.post<ApiResponse<string>>('/ai/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  monthlyInsights: (month: number, year: number, language?: string) =>
    http.get<ApiResponse<MonthlyInsightsDto>>('/ai/insights/monthly', { params: { month, year, language } }),
};
