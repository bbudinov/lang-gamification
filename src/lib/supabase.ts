import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Hard-coded fallbacks ensure the client always works
const SUPABASE_URL = "https://ydigtdvkyqpzfbkewdrq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkaWd0ZHZreXFwemZia2V3ZHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjY2NzYsImV4cCI6MjA4ODcwMjY3Nn0.sZv5fx5ExBqXACy0k7hWxRY40-KLsw4IVyIQowDpURg";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL).replace(/\s+/g, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY).replace(/\s+/g, "");

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
