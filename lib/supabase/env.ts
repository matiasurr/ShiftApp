// Centralized Supabase env reading so all client factories stay consistent.
//
// Supabase renamed the "anon" key to the "publishable" key
// (sb_publishable_...). We accept either env var name: the modern
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, falling back to the legacy
// NEXT_PUBLIC_SUPABASE_ANON_KEY.
//
// These literals must be referenced directly (not computed) so Next.js can
// inline the NEXT_PUBLIC_* values into the browser bundle at build time.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
