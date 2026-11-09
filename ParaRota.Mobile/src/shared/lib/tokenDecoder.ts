import { jwtDecode } from 'jwt-decode';

export interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  roles?: string[] | string;
  [key: string]: unknown;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - skewSeconds <= now;
}
