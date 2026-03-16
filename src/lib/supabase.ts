import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydigtdvkyqpzfbkewdrq.supabase.co").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkaWd0ZHZreXFwemZia2V3ZHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjY2NzYsImV4cCI6MjA4ODcwMjY3Nn0.sZv5fx5ExBqXACy0k7hWxRY40-KLsw4IVyIQowDpURg").trim();

// Gracefully handle missing env vars (e.g. during SSG build)
export const supabase: SupabaseClient = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);
