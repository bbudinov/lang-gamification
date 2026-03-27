"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPin: (displayName: string, pin: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  pin_code: string | null;
  role: "player" | "teacher" | "parent";
  native_language: string;
  target_language: string;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    try {
      // Get current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ user: session.user, profile, loading: false, initialized: true });
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }
    } catch {
      // Timeout or error — continue without auth
      set({ user: null, profile: null, loading: false, initialized: true });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ user: session.user, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  signUpWithEmail: async (email, password, displayName) => {
    set({ loading: true });

    if (!supabase) {
      set({ loading: false });
      return { error: "Server connection unavailable. Try again later." };
    }

    // Sanitize inputs — remove invisible characters that break fetch
    const cleanEmail = email.replace(/[^\x20-\x7E]/g, "").trim();
    const cleanPassword = password.trim();
    const cleanName = displayName.replace(/[^\x20-\x7E\u0400-\u04FF\u0000-\uFFFF]/g, "").trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: { data: { display_name: cleanName } },
      });

      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      if (!data.user) {
        set({ loading: false });
        return { error: "Signup failed — no user returned" };
      }

      if (!data.session) {
        set({ loading: false });
        return { error: "Signup OK but no session — is email confirmation disabled in Supabase?" };
      }

      // Session exists — create profile + progress rows
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: displayName,
      }, { onConflict: "id" });

      if (profileErr) {
        console.error("Profile error:", profileErr);
      }

      const { error: progressErr } = await supabase.from("progress").upsert({
        user_id: data.user.id,
      }, { onConflict: "user_id" });

      if (progressErr) {
        console.error("Progress error:", progressErr);
      }

      const profile = await fetchProfile(data.user.id);
      set({ user: data.user, profile, loading: false });
    } catch (err: any) {
      set({ loading: false });
      const msg = err?.message || "Unknown error";
      // Show debug info for fetch errors (user tests on mobile, no DevTools)
      if (msg.includes("fetch") || msg.includes("Invalid")) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "(empty)";
        return { error: `${msg} [URL: ${url.slice(0, 30)}...]` };
      }
      return { error: msg };
    }

    return { error: null };
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    if (!supabase) {
      set({ loading: false });
      return { error: "Server connection unavailable. Try again later." };
    }
    const cleanEmail = email.replace(/[^\x20-\x7E]/g, "").trim();
    const cleanPassword = password.trim();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
      set({ loading: false });
      return { error: error?.message ?? null };
    } catch (e: unknown) {
      set({ loading: false });
      return { error: e instanceof Error ? e.message : "Login failed" };
    }
  },

  // PIN login — reconstructs deterministic email/password from name+pin
  signInWithPin: async (displayName, pin) => {
    set({ loading: true });
    if (!supabase) {
      set({ loading: false });
      return { error: "Server connection unavailable. Try again later." };
    }

    const safeName = displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `kid-${safeName}-${pin}@langworld.app`;
    const password = `lw-pin-${pin}-${safeName}`;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    set({ loading: false });
    if (error) {
      return { error: "Wrong name or PIN" };
    }
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    const profile = await fetchProfile(user.id);
    set({ profile });
  },
}));

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data as UserProfile | null;
}
