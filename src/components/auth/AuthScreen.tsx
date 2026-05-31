"use client";
import { useEffect, useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "welcome" | "google_loading" | "phone" | "otp" | "magic" | "magic_sent" | "email";

// ── tiny shared input style ──────────────────────────────────────────────────
const INPUT = "w-full px-4 py-4 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/35 focus:outline-none focus:border-white/70 text-base";
const BTN_RED = "w-full py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-xl disabled:opacity-50 active:scale-95 transition-transform";
const BTN_OUTLINE = "w-full py-4 rounded-2xl border-2 border-white/40 text-white font-semibold text-base active:scale-95 transition-transform";

export default function AuthScreen() {
  const { signIn, signUp, sendMagicLink, signInWithGoogle, signInWithSocial, continueAsGuest, closeAuth } = useAuth();

  const [mode, setMode] = useState<Mode>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // email/password fields
  const [signMode, setSignMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // magic link
  const [magicEmail, setMagicEmail] = useState("");

  // phone OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  // Init invisible reCAPTCHA when phone mode activates
  useEffect(() => {
    if (mode === "phone" && !verifierRef.current && recaptchaRef.current) {
      try {
        verifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
          size: "invisible",
          callback: () => {},
        });
      } catch { /* already initialized */ }
    }
  }, [mode]);

  const reset = (m: Mode) => { setMode(m); setError(""); setLoading(false); };

  // ── Google ─────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError(""); setMode("google_loading");
    const { error } = await signInWithGoogle();
    if (error) { setError(error); setMode("welcome"); }
    setLoading(false);
  };

  // ── Phone send OTP ─────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) { setError("Enter a valid phone number"); return; }
    // Prepend +977 if no country code
    const full = phone.startsWith("+") ? phone : `+977${digits}`;
    setLoading(true); setError("");
    try {
      if (!verifierRef.current) throw new Error("reCAPTCHA not ready");
      const confirmation = await signInWithPhoneNumber(auth, full, verifierRef.current);
      confirmRef.current = confirmation;
      reset("otp");
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to send OTP. Check the number.");
    }
    setLoading(false);
  };

  // ── Phone verify OTP ───────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError("Enter the 6-digit code"); return; }
    if (!confirmRef.current) { setError("Session expired. Try again."); reset("phone"); return; }
    setLoading(true); setError("");
    try {
      const result = await confirmRef.current.confirm(otp);
      const fbUser = result.user;
      // Phone users get a synthetic email for our system
      const syntheticEmail = `${fbUser.phoneNumber?.replace(/\D/g, "")}@phone.inshortsnepal.org`;
      const { error } = await signInWithSocial(syntheticEmail, fbUser.phoneNumber ?? "Phone User", "phone", fbUser.uid);
      if (error) setError(error);
    } catch {
      setError("Wrong code. Please try again.");
    }
    setLoading(false);
  };

  // ── Magic link ─────────────────────────────────────────────────────────────
  const handleMagicLink = async () => {
    if (!magicEmail.includes("@")) { setError("Enter a valid email address"); return; }
    setLoading(true); setError("");
    const { error } = await sendMagicLink(magicEmail);
    if (error) setError(error);
    else reset("magic_sent");
    setLoading(false);
  };

  // ── Email / Password ───────────────────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (signMode === "signup" && !name) { setError("Enter your name"); return; }
    if (!email || !password) { setError("Fill in all fields"); return; }
    setLoading(true); setError("");
    const { error } = signMode === "signin"
      ? await signIn(email, password)
      : await signUp(name, email, password);
    if (error) setError(error);
    setLoading(false);
  };

  // ── Screens ────────────────────────────────────────────────────────────────

  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#DC143C] via-[#8B0000] to-[#003893] flex flex-col items-center justify-start overflow-y-auto">
      {/* Hidden reCAPTCHA container — always in DOM when modal is open */}
      <div ref={recaptchaRef} id="recaptcha-container" />
      <div className="w-full max-w-sm px-6 py-10 flex flex-col min-h-full">
        {children}
      </div>
    </div>
  );

  // ── Welcome ────────────────────────────────────────────────────────────────
  if (mode === "welcome" || mode === "google_loading") {
    return (
      <Wrap>
        <div className="flex flex-col items-center mb-8 mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="InShorts Nepal" className="w-20 h-20 rounded-2xl mb-4 shadow-2xl" />
          <h1 className="text-3xl font-black text-white">InShorts Nepal</h1>
          <p className="text-white/60 text-sm mt-1">नेपालको सबैभन्दा राम्रो समाचार एप</p>
        </div>

        {error && <p className="text-red-200 text-sm text-center mb-4 bg-white/10 rounded-xl px-4 py-3">⚠️ {error}</p>}

        <div className="space-y-3 w-full">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-white flex items-center justify-center gap-3 font-semibold text-gray-800 text-base shadow-xl disabled:opacity-60 active:scale-95 transition-transform"
          >
            {mode === "google_loading" ? (
              <span className="animate-spin text-xl">⟳</span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            {mode === "google_loading" ? "Signing in…" : "Continue with Google"}
          </button>

          {/* Phone OTP */}
          <button onClick={() => reset("phone")} className={BTN_OUTLINE}>
            📱 Continue with Phone
          </button>

          {/* Magic Link */}
          <button onClick={() => reset("magic")} className={BTN_OUTLINE}>
            ✉️ Sign in with Email Link
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/35 text-xs">or</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Email + Password */}
          <button onClick={() => reset("email")} className="w-full py-3 text-white/55 text-sm underline underline-offset-2">
            Email &amp; password
          </button>
        </div>

        <button onClick={continueAsGuest} className="mt-auto pt-8 text-white/40 text-sm">
          Continue as Guest →
        </button>

        <button onClick={closeAuth} className="absolute top-4 right-4 text-white/40 text-2xl leading-none">×</button>
      </Wrap>
    );
  }

  // ── Phone number entry ─────────────────────────────────────────────────────
  if (mode === "phone") {
    return (
      <Wrap>
        <button onClick={() => reset("welcome")} className="text-white/50 mb-8 self-start">← Back</button>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📱</div>
          <h2 className="text-2xl font-bold text-white">Phone sign-in</h2>
          <p className="text-white/55 text-sm mt-1">We&apos;ll send a one-time code</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-xs uppercase tracking-wider font-semibold mb-1 block">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+977 98XXXXXXXX"
              className={INPUT}
              autoFocus
            />
            <p className="text-white/35 text-xs mt-1">Include country code, e.g. +977 for Nepal</p>
          </div>
          {error && <p className="text-red-200 text-sm bg-white/10 rounded-xl px-4 py-3">⚠️ {error}</p>}
          <button onClick={handleSendOtp} disabled={loading} className={BTN_RED}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </div>
      </Wrap>
    );
  }

  // ── OTP verification ───────────────────────────────────────────────────────
  if (mode === "otp") {
    return (
      <Wrap>
        <button onClick={() => reset("phone")} className="text-white/50 mb-8 self-start">← Back</button>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔢</div>
          <h2 className="text-2xl font-bold text-white">Enter code</h2>
          <p className="text-white/55 text-sm mt-1">Sent to <span className="text-white font-medium">{phone}</span></p>
        </div>
        <div className="space-y-4">
          <input
            type="number"
            inputMode="numeric"
            value={otp}
            onChange={e => setOtp(e.target.value.slice(0, 6))}
            placeholder="• • • • • •"
            className={`${INPUT} text-center text-2xl tracking-[0.5em] font-bold`}
            autoFocus
          />
          {error && <p className="text-red-200 text-sm bg-white/10 rounded-xl px-4 py-3">⚠️ {error}</p>}
          <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className={BTN_RED}>
            {loading ? "Verifying…" : "Verify Code"}
          </button>
          <button onClick={handleSendOtp} className="w-full text-white/45 text-sm py-2">
            Resend code
          </button>
        </div>
      </Wrap>
    );
  }

  // ── Magic link input ───────────────────────────────────────────────────────
  if (mode === "magic") {
    return (
      <Wrap>
        <button onClick={() => reset("welcome")} className="text-white/50 mb-8 self-start">← Back</button>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✉️</div>
          <h2 className="text-2xl font-bold text-white">Magic link</h2>
          <p className="text-white/55 text-sm mt-1">No password needed — get a sign-in link by email</p>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            value={magicEmail}
            onChange={e => setMagicEmail(e.target.value)}
            placeholder="your@email.com"
            className={INPUT}
            autoFocus
          />
          {error && <p className="text-red-200 text-sm bg-white/10 rounded-xl px-4 py-3">⚠️ {error}</p>}
          <button onClick={handleMagicLink} disabled={loading} className={BTN_RED}>
            {loading ? "Sending…" : "Send Magic Link"}
          </button>
        </div>
      </Wrap>
    );
  }

  // ── Magic link sent ────────────────────────────────────────────────────────
  if (mode === "magic_sent") {
    return (
      <Wrap>
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 mt-16">
          <div className="text-6xl">📬</div>
          <h2 className="text-2xl font-bold text-white">Check your inbox!</h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            We sent a sign-in link to <span className="text-white font-semibold">{magicEmail}</span>.<br />
            Tap the link in the email to sign in instantly.
          </p>
          <p className="text-white/35 text-xs mt-2">Link expires in 15 minutes.</p>
          <button onClick={() => reset("magic")} className="mt-6 text-white/50 text-sm underline">
            Use a different email
          </button>
          <button onClick={closeAuth} className="text-white/35 text-sm">
            Close
          </button>
        </div>
      </Wrap>
    );
  }

  // ── Email + Password ───────────────────────────────────────────────────────
  return (
    <Wrap>
      <button onClick={() => reset("welcome")} className="text-white/50 mb-8 self-start">← Back</button>
      <div className="text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-xl mx-auto mb-3 shadow-xl" />
        <h2 className="text-2xl font-bold text-white">
          {signMode === "signin" ? "Welcome back" : "Create account"}
        </h2>
      </div>

      <div className="flex rounded-2xl border border-white/25 overflow-hidden mb-6">
        {(["signin", "signup"] as const).map(m => (
          <button
            key={m}
            onClick={() => { setSignMode(m); setError(""); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${signMode === m ? "bg-white/20 text-white" : "text-white/45"}`}
          >
            {m === "signin" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {signMode === "signup" && (
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={INPUT} />
        )}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={INPUT} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={INPUT} />

        {error && <p className="text-red-200 text-sm bg-white/10 rounded-xl px-4 py-3">⚠️ {error}</p>}

        <button onClick={handleEmailAuth} disabled={loading} className={BTN_RED}>
          {loading ? "Please wait…" : signMode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </div>

      <button onClick={continueAsGuest} className="mt-auto pt-8 text-white/40 text-sm">
        Continue as Guest →
      </button>
    </Wrap>
  );
}
