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
  /** Kullanıcının gördüğü en yüksek onboarding sürümü (0 = hiç görmedi). */
  onboardingSeenVersion: number;
  /** Profil rozeti: "ikonAdı|#RRGGBB" (ör. "cat|#0EA5E9"); null = seçilmemiş → baş harfler. */
  avatar: string | null;
  /** Opt-in: ay başında geçen ayın özet PDF'i e-postayla gönderilsin mi. */
  sendMonthlyPdfEmail: boolean;
  roles: string[];
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
