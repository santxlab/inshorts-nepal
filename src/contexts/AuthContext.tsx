"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isGuest: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithSocial: (email: string, name: string, provider: "google" | "phone", providerId?: string) => Promise<{ error?: string }>;
  continueAsGuest: () => void;
  signOut: () => void;
  isAuthenticated: boolean;
  showAuth: boolean;
  openAuth: () => void;
  closeAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "inshorts-nepal-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const { user, token } = JSON.parse(raw);
        setUser(user);
        setToken(token);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const persist = useCallback((user: AppUser, token: string) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
    setUser(user);
    setToken(token);
    setShowAuth(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Sign in failed" };
      persist(data.user, data.token);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [persist]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Sign up failed" };
      persist(data.user, data.token);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [persist]);

  const sendMagicLink = useCallback(async (email: string) => {
    try {
      const res = await fetch("/api/auth/magic-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to send link" };
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, []);

  const signInWithSocial = useCallback(async (
    email: string,
    name: string,
    provider: "google" | "phone",
    providerId?: string
  ) => {
    try {
      const res = await fetch("/api/auth/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, provider, providerId }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Sign in failed" };
      persist(data.user, data.token);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [persist]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      return await signInWithSocial(
        fbUser.email ?? `${fbUser.uid}@google.inshortsnepal.org`,
        fbUser.displayName ?? "Google User",
        "google",
        fbUser.uid
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return {};
      }
      console.error("[signInWithGoogle]", err);
      return { error: "Google sign-in failed. Please try again." };
    }
  }, [signInWithSocial]);

  const continueAsGuest = useCallback(() => {
    const guest: AppUser = {
      id: `guest-${Date.now()}`,
      name: "Guest",
      email: "",
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    persist(guest, "guest-token");
  }, [persist]);

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      signIn, signUp, sendMagicLink, signInWithGoogle, signInWithSocial,
      continueAsGuest, signOut,
      isAuthenticated: !!user,
      showAuth, openAuth: () => setShowAuth(true), closeAuth: () => setShowAuth(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
