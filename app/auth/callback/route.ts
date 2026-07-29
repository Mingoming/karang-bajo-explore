import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticationState } from "@/lib/auth/admin";
import { getSafeAuthCallbackRedirect } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeAuthCallbackRedirect(
    request.nextUrl.searchParams.get("next"),
  );
  const authHeaders: Record<string, string> = {};
  const supabase = await createClient((headers) => {
    Object.assign(authHeaders, headers);
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const state = await getAuthenticationState(supabase);

      if (state.kind === "administrator") {
        const response = NextResponse.redirect(
          new URL(nextPath, request.nextUrl.origin),
        );
        Object.entries(authHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
        return response;
      }

      if (state.kind === "non-admin") {
        console.warn(
          "Callback autentikasi ditolak: identitas bukan administrator yang dikonfigurasi.",
        );
        await supabase.auth.signOut();
      }
    }
  }

  const failurePath =
    nextPath === "/reset-password"
      ? "/lupa-password?error=invalid-recovery-link"
      : "/login?error=invalid-credentials";
  const response = NextResponse.redirect(
    new URL(failurePath, request.nextUrl.origin),
  );
  Object.entries(authHeaders).forEach(([name, value]) => {
    response.headers.set(name, value);
  });
  return response;
}
