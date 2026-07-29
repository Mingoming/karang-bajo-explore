import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "@/lib/supabase/env";

type AuthHeadersHandler = (headers: Record<string, string>) => void;

export async function createClient(onAuthHeaders?: AuthHeadersHandler) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          onAuthHeaders?.(headers);
        } catch {
          // Server Components cannot write cookies. The root Proxy performs
          // session refresh before protected Server Components render.
        }
      },
    },
  });
}
