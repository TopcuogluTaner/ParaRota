import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/useAuthStore';

/**
 * Admin-only wrapper. Non-admin'i dashboard'a yönlendirir. AdminPage içinde
 * de role check var ama burası defense-in-depth: router seviyesinde render
 * etmeden yönlendirir.
 */
export function AdminRoute() {
  const isAdmin = useAuthStore((s) => s.hasRole('Admin'));
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
