// ──────────────────────────────────────────────────────────
// Mirrors ParaRota.Application.DTOs.Auth — keep field names in sync.
// ASP.NET Core serializes PascalCase → camelCase by default.
// ──────────────────────────────────────────────────────────

export interface LoginRequest {
  emailOrUserName: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationCodeRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthUser {
  id: number;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  roles: string[];
  /** Profil rozeti: "ikonAdı|#RRGGBB" (MDI ikon adı, mobil ile ortak format) ya da null. */
  avatar: string | null;
  /** Opt-in: ay başında geçen ayın özet PDF'i e-postayla gönderilsin mi. */
  sendMonthlyPdfEmail: boolean;
  /** Web tanıtım turunun görülen en yüksek sürümü; 0 = hiç görülmedi. */
  webOnboardingSeenVersion: number;
  /** Premium erişimi açık mı (aktif abonelik VEYA 30g uygulama denemesi). Sunucu = yetkili kaynak. */
  isPremium: boolean;
  /** 30 günlük uygulama denemesi şu an sürüyor mu (abonelik olmadan). */
  isInTrial: boolean;
  /** Premium erişimin bitiş zamanı (ISO). */
  premiumExpiresAt: string | null;
  /** Uygulama denemesinin bitiş zamanı (ISO). */
  trialEndsAt: string | null;
  /** Aktif plan: 'monthly' | 'yearly' | 'trial' | null. */
  plan: string | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}
