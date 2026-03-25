type CookieLike = {
  name: string;
  value: string;
};

type CookieStoreLike = {
  getAll(): CookieLike[];
};

export function hasSessionCookie(cookieStore: CookieStoreLike) {
  return cookieStore
    .getAll()
    .some((cookie) => cookie.name.includes('-auth-token') && cookie.value.length > 0);
}
