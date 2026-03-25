import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Vérifie la présence d'un cookie de session Supabase
// Supabase SSR stocke le token dans "sb-<project-ref>-auth-token"
export function hasSessionCookie(cookieStore: ReadonlyRequestCookies): boolean {
  return cookieStore.getAll().some(
    (c) => c.name.includes('-auth-token') && c.value.length > 0
  );
}
