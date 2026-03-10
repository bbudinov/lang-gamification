"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const AVATARS = ["🦊", "🐱", "🐶", "🦁", "🐼", "🐸", "🦄", "🐙", "🐬", "🦋", "🐧", "🐨"];

type Mode = "choose" | "kid-login" | "kid-signup" | "parent-login" | "parent-signup";

export default function LoginPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithEmail, signInWithPin, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState("");

  // Kid fields
  const [kidName, setKidName] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState("🦊");

  // Parent fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleKidLogin = async () => {
    setError("");
    if (!kidName.trim() || pin.length !== 4) {
      setError("Enter your name and 4-digit PIN");
      return;
    }
    const result = await signInWithPin(kidName.trim(), pin);
    if (result.error) {
      setError(result.error);
    } else {
      router.replace("/map");
    }
  };

  const handleKidSignup = async () => {
    setError("");
    if (!kidName.trim()) {
      setError("Enter your name");
      return;
    }
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    const safeId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const fakeEmail = `kid-${safeId}@langworld.app`;
    const result = await signUpWithEmail(fakeEmail, `pin-${pin}-${safeId}`, kidName.trim());
    if (result.error) {
      setError(result.error);
    } else {
      const { updateProfile } = useAuthStore.getState();
      updateProfile({ avatar_emoji: avatar, pin_code: pin, role: "player" }).catch(() => {});
      router.replace("/map");
    }
  };

  const handleParentLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    const result = await signInWithEmail(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      router.replace("/map");
    }
  };

  const handleParentSignup = async () => {
    setError("");
    if (!email || !password || !displayName.trim()) {
      setError("Fill in all fields");
      return;
    }
    const result = await signUpWithEmail(email, password, displayName.trim());
    if (result.error) {
      setError(result.error);
    } else {
      router.replace("/map");
    }
  };

  if (mode === "choose") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-6">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-3xl font-bold text-white mb-2">LangWorld</h1>
        <p className="text-slate-400 text-sm mb-10">Choose how to play</p>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => setMode("kid-signup")}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-semibold py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            🎮 I'm a Kid
          </button>
          <button
            onClick={() => setMode("parent-login")}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            👨‍👩‍👧 Parent / Teacher
          </button>
          <button
            onClick={() => router.replace("/map")}
            className="w-full text-slate-500 text-sm py-3 active:text-white transition-colors"
          >
            Play without account →
          </button>
        </div>
      </div>
    );
  }

  if (mode === "kid-login" || mode === "kid-signup") {
    const isSignup = mode === "kid-signup";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-6">
        <button onClick={() => setMode("choose")} className="absolute top-6 left-4 text-slate-500 text-sm">
          ← Back
        </button>

        <div className="text-5xl mb-3">{isSignup ? avatar : "🎮"}</div>
        <h2 className="text-2xl font-bold text-white mb-6">
          {isSignup ? "Create Your Hero" : "Welcome Back!"}
        </h2>

        <div className="w-full max-w-xs space-y-4">
          {/* Avatar picker (signup only) */}
          {isSignup && (
            <div>
              <p className="text-slate-400 text-xs mb-2 text-center">Pick your avatar</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-2xl p-1.5 rounded-xl transition-all ${
                      avatar === a ? "bg-white/20 scale-110" : "bg-white/5 active:bg-white/10"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <input
            type="text"
            placeholder="Your name"
            value={kidName}
            onChange={(e) => setKidName(e.target.value)}
            className="w-full bg-white/10 text-white text-center text-lg rounded-xl px-4 py-3 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-green-500/50"
            maxLength={20}
            autoComplete="off"
          />

          {/* PIN — simple visible input */}
          <div>
            <p className="text-slate-400 text-xs mb-2 text-center">
              {isSignup ? "Choose a 4-digit PIN" : "Enter your PIN"}
            </p>
            <input
              type="tel"
              placeholder="● ● ● ●"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full bg-white/10 text-white text-center text-2xl tracking-[0.5em] rounded-xl px-4 py-3 placeholder:text-slate-600 placeholder:tracking-[0.3em] outline-none focus:ring-2 focus:ring-green-500/50"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={isSignup ? handleKidSignup : handleKidLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-semibold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "..." : isSignup ? "Let's Go! 🚀" : "Play! 🎮"}
          </button>

          <button
            onClick={() => setMode(isSignup ? "kid-login" : "kid-signup")}
            className="w-full text-slate-500 text-sm py-2 active:text-white transition-colors"
          >
            {isSignup ? "Already have an account? Log in" : "New here? Create account"}
          </button>
        </div>
      </div>
    );
  }

  // Parent/Teacher mode
  const isSignup = mode === "parent-signup";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-6">
      <button onClick={() => setMode("choose")} className="absolute top-6 left-4 text-slate-500 text-sm">
        ← Back
      </button>

      <div className="text-5xl mb-3">👨‍🏫</div>
      <h2 className="text-2xl font-bold text-white mb-6">
        {isSignup ? "Create Account" : "Welcome Back"}
      </h2>

      <div className="w-full max-w-xs space-y-4">
        {isSignup && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50"
        />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={isSignup ? handleParentSignup : handleParentLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "..." : isSignup ? "Sign Up" : "Log In"}
        </button>

        <button
          onClick={() => setMode(isSignup ? "parent-login" : "parent-signup")}
          className="w-full text-slate-500 text-sm py-2 active:text-white transition-colors"
        >
          {isSignup ? "Already have an account? Log in" : "New here? Create account"}
        </button>
      </div>
    </div>
  );
}
