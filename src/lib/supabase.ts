import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Log warning in browser if env vars are missing (helps debug prod issues)
if (typeof window !== "undefined" && !supabaseUrl) {
  console.error("[LangWorld] NEXT_PUBLIC_SUPABASE_URL is missing! Auth will not work.");
}

// Gracefully handle missing env vars (e.g. during SSG build)
export const supabase: SupabaseClient = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);
