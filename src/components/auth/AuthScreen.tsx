"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthScreen() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<"welcome" | "signin" | "signup">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) { setError("Fill in all fields"); return; }
    setLoading(true); setError("");
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) { setError("Fill in all fields"); return; }
    setLoading(true); setError("");
    const { error } = await signUp(name, email, password);
    if (error) setError(error);
    setLoading(false);
  };

  if (mode === "welcome") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#DC143C] via-[#8B0000] to-[#003893] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🇳🇵</div>
        <h1 className="text-4xl font-black text-white mb-2">InShorts Nepal</h1>
        <p className="text-white/70 text-lg mb-1">Nepal's #1 news app</p>
        <p className="text-white/50 text-sm mb-12">नेपालको सबैभन्दा राम्रो समाचार एप</p>

        <div className="w-full space-y-3 max-w-sm">
          <button
            onClick={() => setMode("signup")}
            className="w-full py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-xl"
          >
            Create Account
          </button>
          <button
            onClick={() => setMode("signin")}
            className="w-full py-4 rounded-2xl border-2 border-white/50 text-white font-bold text-lg"
          >
            Sign In
          </button>
          <button
            onClick={continueAsGuest}
            className="w-full py-3 text-white/60 text-sm"
          >
            Continue as Guest →
          </button>
        </div>

        <div className="mt-12 flex gap-6 text-white/40 text-xs">
          <span>🔒 Privacy first</span>
          <span>📰 100% free</span>
          <span>⚡ Lightning fast</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#DC143C] via-[#8B0000] to-[#003893] flex flex-col px-6 pt-16">
      <button onClick={() => { setMode("welcome"); setError(""); }} className="self-start text-white/60 mb-8">
        ← Back
      </button>

      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🇳🇵</div>
        <h2 className="text-2xl font-bold text-white">
          {mode === "signin" ? "Welcome back" : "Join InShorts Nepal"}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {mode === "signin" ? "Sign in to your account" : "Create your free account"}
        </p>
      </div>

      <div className="space-y-4 max-w-sm w-full mx-auto">
        {mode === "signup" && (
          <div>
            <label className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-1 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rajan Sharma"
              className="w-full px-4 py-4 rounded-xl bg-white/15 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-white text-base"
            />
          </div>
        )}

        <div>
          <label className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rajan@example.com"
            className="w-full px-4 py-4 rounded-xl bg-white/15 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-white text-base"
          />
        </div>

        <div>
          <label className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-1 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-4 rounded-xl bg-white/15 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-white text-base"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-white/10 border border-red-400/50 text-red-200 text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={mode === "signin" ? handleSignIn : handleSignUp}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-xl disabled:opacity-60 mt-2"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        <div className="text-center">
          {mode === "signin" ? (
            <button onClick={() => { setMode("signup"); setError(""); }} className="text-white/60 text-sm">
              New here? <span className="text-white font-semibold underline">Create account</span>
            </button>
          ) : (
            <button onClick={() => { setMode("signin"); setError(""); }} className="text-white/60 text-sm">
              Already have an account? <span className="text-white font-semibold underline">Sign in</span>
            </button>
          )}
        </div>

        <button
          onClick={continueAsGuest}
          className="w-full py-3 text-white/50 text-sm"
        >
          Continue as Guest →
        </button>
      </div>
    </div>
  );
}
