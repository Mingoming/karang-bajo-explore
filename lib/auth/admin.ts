import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AuthenticationState =
  | { kind: "anonymous" }
  | { kind: "non-admin"; user: User }
  | { kind: "administrator"; user: User };

export async function getAuthenticationState(
  existingClient?: SupabaseClient,
): Promise<AuthenticationState> {
  const supabase = existingClient ?? (await createClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { kind: "anonymous" };
  }

  const { data: isAdmin, error: authorizationError } =
    await supabase.rpc("is_admin");

  if (authorizationError || isAdmin !== true) {
    return { kind: "non-admin", user };
  }

  return { kind: "administrator", user };
}

export async function requireAdministrator() {
  const supabase = await createClient();
  const state = await getAuthenticationState(supabase);

  if (state.kind === "administrator") {
    return state.user;
  }

  if (state.kind === "non-admin") {
    console.warn(
      "Akses admin ditolak: sesi terautentikasi bukan administrator yang dikonfigurasi.",
    );
    await supabase.auth.signOut();
    redirect("/login?error=not-authorized");
  }

  redirect("/login?error=session-required");
}
