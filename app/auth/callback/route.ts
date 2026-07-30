import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value === "/reset-password" ? value : "/admin";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!code) {
    const destination =
      next === "/reset-password"
        ? "/lupa-password?error=invalid-recovery-link"
        : "/login?error=invalid-credentials";

    return NextResponse.redirect(new URL(destination, request.url));
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Pertukaran kode autentikasi gagal.", {
      code: exchangeError.code ?? null,
      message: exchangeError.message,
    });

    const destination =
      next === "/reset-password"
        ? "/lupa-password?error=invalid-recovery-link"
        : "/login?error=invalid-credentials";

    return NextResponse.redirect(new URL(destination, request.url));
  }

  /*
   * Recovery session bukan login admin.
   * Setelah code berhasil ditukar, user harus langsung diarahkan ke form
   * reset password agar session recovery dapat digunakan oleh updateUser().
   */
  if (next === "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  /*
   * Hanya callback login normal yang memerlukan pemeriksaan administrator.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login?error=invalid-credentials", request.url),
    );
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || isAdmin !== true) {
    console.warn(
      "Callback autentikasi ditolak: identitas bukan administrator yang dikonfigurasi.",
    );

    await supabase.auth.signOut({ scope: "global" });

    return NextResponse.redirect(
      new URL("/login?error=not-authorized", request.url),
    );
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
