import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSafeAdminRedirect } from "@/lib/auth/redirects";
import { getSupabaseConfig } from "@/lib/supabase/env";

function copyAuthState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));

  for (const headerName of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(headerName);

    if (value) {
      target.headers.set(headerName, value);
    }
  }

  return target;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/login";
  const isResetPasswordRoute = pathname === "/reset-password";
  let isAdministrator = false;

  if (user) {
    const { data, error } = await supabase.rpc("is_admin");
    isAdministrator = !error && data === true;
  }

  if (isAdminRoute && (!user || !isAdministrator)) {
    if (user) {
      console.warn(
        "Akses admin ditolak oleh Proxy: identitas terautentikasi tidak dikonfigurasi sebagai administrator.",
      );
      await supabase.auth.signOut();
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "error",
      user ? "not-authorized" : "session-required",
    );
    loginUrl.searchParams.set(
      "next",
      getSafeAdminRedirect(`${pathname}${request.nextUrl.search}`),
    );

    return copyAuthState(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (isLoginRoute && user) {
    if (isAdministrator) {
      const adminUrl = new URL(
        getSafeAdminRedirect(request.nextUrl.searchParams.get("next")),
        request.url,
      );

      return copyAuthState(supabaseResponse, NextResponse.redirect(adminUrl));
    }

    console.warn(
      "Sesi non-administrator dihentikan saat mengakses halaman login.",
    );
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "not-authorized");

    return copyAuthState(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (isResetPasswordRoute && user && !isAdministrator) {
    console.warn(
      "Sesi pemulihan ditolak: identitas bukan administrator yang dikonfigurasi.",
    );
    await supabase.auth.signOut();
    const recoveryUrl = request.nextUrl.clone();
    recoveryUrl.pathname = "/lupa-password";
    recoveryUrl.search = "";
    recoveryUrl.searchParams.set("error", "invalid-recovery-link");

    return copyAuthState(supabaseResponse, NextResponse.redirect(recoveryUrl));
  }

  return supabaseResponse;
}
