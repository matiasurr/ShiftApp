import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers.
 *
 * In Next.js 16 `cookies()` is async, so this factory is async too. Server
 * Components cannot write cookies, so the `setAll` handler swallows errors that
 * occur in that context — session refresh is handled by `proxy.ts` instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore because the
          // session is refreshed by the proxy (middleware).
        }
      },
    },
  });
}
