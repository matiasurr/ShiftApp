import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for use in Client Components (browser).
 * Safe to call on every render; the underlying client is cached internally.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
