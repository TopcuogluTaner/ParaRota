import { useMutation } from '@tanstack/react-query';
import { authApi } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';

// ──────────────────────────────────────────────────────────
// Profil rozetini kaydet/kaldır — POST /auth/avatar (mobil ile aynı endpoint).
// Başarıda store'daki kullanıcı YERİNDE güncellenir (anında UI yansıması),
// ardından /auth/me arka planda tazelenir — fetchUser() KULLANILMAZ çünkü
// isInitializing'i tetikleyip tüm app tree'yi loading'e düşürür.
// ──────────────────────────────────────────────────────────

export function useSetAvatar() {
  return useMutation({
    mutationFn: async (avatar: string | null) => {
      const resp = await authApi.setAvatar(avatar);
      if (!resp.data.isSuccess) {
        // resolveApiError'ın beklediği shape — errorCode/message korunur.
        throw Object.assign(new Error(resp.data.message ?? 'Avatar update failed'), {
          response: { data: resp.data },
        });
      }
      return avatar;
    },
    onSuccess: (avatar) => {
      useAuthStore.setState((s) => (s.user ? { user: { ...s.user, avatar } } : {}));
      // Sunucu doğrusuyla sessiz senkron (optimistic-ish: UI zaten güncel).
      void authApi
        .me()
        .then((r) => {
          if (r.data.isSuccess && r.data.data) useAuthStore.setState({ user: r.data.data });
        })
        .catch(() => {
          /* sessiz — yerel state zaten doğru değeri taşıyor */
        });
    },
  });
}
