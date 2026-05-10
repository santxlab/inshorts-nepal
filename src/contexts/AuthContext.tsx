"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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
  continueAsGuest: () => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "inshorts-nepal-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      signIn, signUp, continueAsGuest, signOut,
      isAuthenticated: !!user,
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
