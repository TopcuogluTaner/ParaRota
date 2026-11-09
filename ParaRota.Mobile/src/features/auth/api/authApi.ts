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

  // Google ile giriş — istemciden gelen Google ID token.
  google: (idToken: string) =>
    http.post<ApiResponse<AuthResponse>>('/auth/google', { idToken }),

  // Apple ile giriş — identity token (+ ilk girişte ad).
  apple: (payload: { identityToken: string; firstName?: string; lastName?: string }) =>
    http.post<ApiResponse<AuthResponse>>('/auth/apple', payload),

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

  // Hesabı + tüm veriyi kalıcı sil.
  deleteAccount: () => http.delete<ApiResponse<unknown>>('/auth/account'),

  setOnboardingSeen: (version: number) =>
    http.post<ApiResponse<number>>('/auth/onboarding', { version }),

  // Profil rozeti ("ikon|#RRGGBB"); null = rozeti kaldır.
  setAvatar: (avatar: string | null) =>
    http.post<ApiResponse<string | null>>('/auth/avatar', { avatar }),

  // Aylık özet PDF e-postası tercihi (opt-in).
  setMonthlyPdfEmail: (enabled: boolean) =>
    http.post<ApiResponse<boolean>>('/auth/monthly-pdf-email', { enabled }),
};
