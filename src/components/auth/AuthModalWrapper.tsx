"use client";
import { useAuth } from "@/contexts/AuthContext";
import AuthScreen from "./AuthScreen";

/** Renders the auth modal overlay whenever showAuth is true. */
export default function AuthModalWrapper() {
  const { showAuth } = useAuth();
  if (!showAuth) return null;
  return <AuthScreen />;
}
