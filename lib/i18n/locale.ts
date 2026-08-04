export const INTERNAL_LOCALE_HEADER = "x-karang-bajo-locale" as const;

export type PublicLocale = "id" | "en";
export type ProxyRequestKind = "locale-only" | "session-refresh";

export function classifyPathnameLocale(pathname: string): PublicLocale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "id";
}

export function classifyProxyRequest(pathname: string): ProxyRequestKind {
  const requiresSessionRefresh =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/login" ||
    pathname === "/reset-password";

  return requiresSessionRefresh ? "session-refresh" : "locale-only";
}

export function createTrustedLocaleHeaders(
  incomingHeaders: Headers,
  pathname: string,
) {
  const trustedHeaders = new Headers(incomingHeaders);
  trustedHeaders.delete(INTERNAL_LOCALE_HEADER);
  trustedHeaders.set(INTERNAL_LOCALE_HEADER, classifyPathnameLocale(pathname));
  return trustedHeaders;
}

export function readTrustedLocale(
  requestHeaders: Pick<Headers, "get">,
): PublicLocale {
  return requestHeaders.get(INTERNAL_LOCALE_HEADER) === "en" ? "en" : "id";
}
