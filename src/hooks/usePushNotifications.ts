"use client";
import { useEffect, useCallback } from "react";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { loadBehaviorProfile } from "@/lib/behavior";

const SW_URL = "/sw.js";

/** Convert base64 URL string to Uint8Array for VAPID key */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/** Full VAPID subscribe + behavior sync in one call. */
export async function subscribeToNotifications(
  userId: string,
  topics: string[],
  language: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    // 1. Get VAPID public key from server
    const keyRes = await fetch("/api/push/subscribe");
    if (!keyRes.ok) return false;
    const { vapidPublicKey } = await keyRes.json();
    if (!vapidPublicKey) {
      console.warn("VAPID key not configured on server — push disabled");
      return false;
    }

    // 2. Register SW
    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    // 3. Subscribe to push
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // 4. Send subscription + behavioral topic scores to server
    const profile = loadBehaviorProfile();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userId,
        topics,
        language,
        topicScores: profile.topicScores,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

/** Sync updated behavioral scores to server (call when feed changes). */
export async function syncBehaviorToServer(endpoint: string): Promise<void> {
  const profile = loadBehaviorProfile();
  if (Object.keys(profile.topicScores).length === 0) return;
  try {
    await fetch("/api/push/behavior", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, topicScores: profile.topicScores }),
    });
  } catch { /* non-critical */ }
}

/**
 * Hook: keeps behavioral scores synced to server every time behavior changes.
 * Mount this in the root layout or main page component.
 */
export function usePushBehaviorSync() {
  const { prefs } = useUserPrefs();

  const sync = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await syncBehaviorToServer(sub.endpoint);
    } catch { /* ignore */ }
  }, []);

  // Sync on mount and whenever the language preference changes
  useEffect(() => {
    const timer = setTimeout(sync, 3000); // slight delay after mount
    return () => clearTimeout(timer);
  }, [sync, prefs.language]);
}
