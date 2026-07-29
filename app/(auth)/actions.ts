"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthenticationState } from "@/lib/auth/admin";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

function readField(formData: FormData, name: string, trim = true) {
  const value = formData.get(name);
  return typeof value === "string" ? (trim ? value.trim() : value) : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    try {
      const url = new URL(origin);

      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Fall through to the host headers supplied by the deployment platform.
    }
  }

  const forwardedHost = requestHeaders
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";

  if (!host || /[\s/\\]/.test(host)) {
    throw new Error(
      "Origin aplikasi tidak tersedia untuk callback autentikasi.",
    );
  }

  const requestOrigin = new URL(`${protocol}://${host}`);

  if (requestOrigin.host !== host) {
    throw new Error("Host callback autentikasi tidak valid.");
  }

  return requestOrigin.origin;
}

export async function loginAction(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password", false);
  const nextPath = getSafeAdminRedirect(readField(formData, "next"));

  if (!isValidEmail(email) || !password) {
    redirect(`/login?error=invalid-input&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=invalid-credentials&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const state = await getAuthenticationState(supabase);

  if (state.kind !== "administrator") {
    if (state.kind === "non-admin") {
      console.warn(
        "Login ditolak: identitas valid bukan administrator yang dikonfigurasi.",
      );
    }

    await supabase.auth.signOut();
    redirect(
      `/login?error=not-authorized&next=${encodeURIComponent(nextPath)}`,
    );
  }

  redirect(nextPath);
}

export async function requestPasswordRecoveryAction(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();

  if (!isValidEmail(email)) {
    redirect("/lupa-password?error=invalid-email");
  }

  const supabase = await createClient();

  try {
    const origin = await getRequestOrigin();
    const redirectTo = new URL("/auth/callback", origin);
    redirectTo.searchParams.set("next", "/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
    });

    if (error) {
      console.error("Permintaan pemulihan kata sandi tidak dapat diproses.");
    }
  } catch {
    console.error("Konfigurasi callback pemulihan kata sandi tidak valid.");
  }

  redirect("/lupa-password?message=recovery-requested");
}

export async function resetPasswordAction(formData: FormData) {
  const password = readField(formData, "password", false);
  const confirmation = readField(formData, "passwordConfirmation", false);

  if (!password || password !== confirmation) {
    redirect("/reset-password?error=password-mismatch");
  }

  const supabase = await createClient();
  const state = await getAuthenticationState(supabase);

  if (state.kind !== "administrator") {
    if (state.kind === "non-admin") {
      await supabase.auth.signOut();
    }

    redirect("/reset-password?error=invalid-recovery-session");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/reset-password?error=password-policy");
  }

  await supabase.auth.signOut();
  redirect("/login?message=password-updated");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=signed-out");
}
