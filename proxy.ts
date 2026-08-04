import { NextResponse, type NextRequest } from "next/server";

import {
  classifyProxyRequest,
  createTrustedLocaleHeaders,
  INTERNAL_LOCALE_HEADER,
} from "@/lib/i18n/locale";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const trustedHeaders = createTrustedLocaleHeaders(request.headers, pathname);

  if (classifyProxyRequest(pathname) === "session-refresh") {
    // updateSession forwards the request object upstream after refreshing
    // cookies, so replace any caller-controlled locale value first.
    request.headers.delete(INTERNAL_LOCALE_HEADER);
    request.headers.set(
      INTERNAL_LOCALE_HEADER,
      trustedHeaders.get(INTERNAL_LOCALE_HEADER) ?? "id",
    );
    return updateSession(request);
  }

  return NextResponse.next({
    request: {
      headers: trustedHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|auth/callback).*)",
  ],
};
