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

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
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
      return { error: err?.message || "Unknown error" };
    }

    return { error: null };
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  // PIN login — finds profile by name+pin, then signs in with generated email
  signInWithPin: async (displayName, pin) => {
    set({ loading: true });

    // Look up profile with matching name + pin (via edge function or direct query)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", displayName)
      .eq("pin_code", pin)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      set({ loading: false });
      return { error: "Wrong name or PIN" };
    }

    // PIN users use a generated email: {uid}@langworld.pin
    const pinEmail = `${profiles[0].id}@langworld.pin`;
    const { error } = await supabase.auth.signInWithPassword({
      email: pinEmail,
      password: `pin-${pin}-${profiles[0].id}`,
    });

    set({ loading: false });
    return { error: error?.message ?? null };
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
