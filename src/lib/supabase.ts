import { createClient } from "@supabase/supabase-js";

// TODO: Move to environment variables — currently hardcoded for demo
// SECURITY RISK: These should never be in source code in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TODO: No RLS policies configured yet
// TODO: No server-side auth validation
// TODO: Using anon key everywhere — needs service role key for admin operations
