import { http } from '@shared/api/httpClient';
import type { ApiResponse } from '@shared/types/apiResponse';
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../types/auth.types';

export const authApi = {
  login: (payload: LoginRequest) => http.post<ApiResponse<AuthResponse>>('/auth/login', payload),

  // Google ile giriş — web: authorization code, mobil: id_token.
  google: (payload: { idToken?: string; code?: string }) =>
    http.post<ApiResponse<AuthResponse>>('/auth/google', payload),

  register: (payload: RegisterRequest) =>
    http.post<ApiResponse<unknown>>('/auth/register', payload),

  me: () => http.get<ApiResponse<AuthUser>>('/auth/me'),

  refresh: (refreshToken: string) =>
    http.post<ApiResponse<AuthResponse>>('/auth/refresh-token', { refreshToken }),

  verifyEmail: (email: string, code: string) =>
    http.post<ApiResponse<unknown>>('/auth/verify-email', { email, code }),

  resendVerificationCode: (email: string) =>
    http.post<ApiResponse<unknown>>('/auth/resend-verification-code', { email }),

  forgotPassword: (email: string) =>
    http.post<ApiResponse<unknown>>('/auth/forgot-password', { email }),

  resetPassword: (payload: ResetPasswordRequest) =>
    http.post<ApiResponse<unknown>>('/auth/reset-password', payload),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<ApiResponse<unknown>>('/auth/change-password', { currentPassword, newPassword }),

  // Web tanıtım turu görüldü — backend yalnız ileri sarar (küçük versiyon geri almaz).
  setOnboardingSeen: (version: number) =>
    http.post<ApiResponse<number>>('/auth/onboarding', { version, platform: 'web' }),

  // Profil rozeti — "ikonAdı|#RRGGBB" ya da null (kaldır). Mobil ile aynı endpoint/format.
  setAvatar: (avatar: string | null) =>
    http.post<ApiResponse<string | null>>('/auth/avatar', { avatar }),

  // Aylık özet PDF e-postası tercihi (opt-in). Mobil ile aynı endpoint.
  setMonthlyPdfEmail: (enabled: boolean) =>
    http.post<ApiResponse<boolean>>('/auth/monthly-pdf-email', { enabled }),

  // Hesabı + tüm veriyi kalıcı sil.
  deleteAccount: () => http.delete<ApiResponse<unknown>>('/auth/account'),
};
