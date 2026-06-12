// Direct Firebase Cloud Messaging (HTTP v1) sender for the native Android app.
// Uses a service-account key to mint a short-lived OAuth token, then POSTs to
// the FCM v1 endpoint. The native app registers its raw FCM device token, so we
// deliver to it directly — no Expo push service in the middle.
//
// Configure with ONE of:
//   FCM_SERVICE_ACCOUNT_JSON  – the service-account JSON as a single-line string
//   FCM_SERVICE_ACCOUNT_FILE  – absolute path to the service-account .json on disk
import { JWT } from "google-auth-library";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch {
      /* fall through */
    }
  }
  const file = process.env.FCM_SERVICE_ACCOUNT_FILE;
  if (file) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      return JSON.parse(fs.readFileSync(file, "utf8")) as ServiceAccount;
    } catch {
      /* fall through */
    }
  }
  return null;
}

let sa: ServiceAccount | null | undefined;
let jwtClient: JWT | null = null;

function getClient(): { client: JWT; projectId: string } | null {
  if (sa === undefined) sa = loadServiceAccount();
  if (!sa) return null;
  if (!jwtClient) {
    jwtClient = new JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
  }
  return { client: jwtClient, projectId: sa.project_id };
}

export function isFcmConfigured(): boolean {
  if (sa === undefined) sa = loadServiceAccount();
  return !!sa;
}

export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send one notification via FCM HTTP v1.
 * Returns "ok", "invalid" (token unregistered → prune it), or "error".
 */
export async function sendFcm(msg: FcmMessage): Promise<"ok" | "invalid" | "error"> {
  const cfg = getClient();
  if (!cfg) return "error";
  try {
    const { token: accessToken } = await cfg.client.getAccessToken();
    if (!accessToken) {
      console.error("[fcm] getAccessToken returned null — check service account credentials");
      return "error";
    }

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: msg.token,
            notification: { title: msg.title, body: msg.body },
            android: {
              priority: "high",
              notification: { channel_id: "default", sound: "default" },
            },
            data: msg.data ?? {},
          },
        }),
      }
    );

    if (res.ok) return "ok";

    const errJson = (await res.json().catch(() => null)) as
      | { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } }
      | null;
    const code =
      errJson?.error?.details?.[0]?.errorCode || errJson?.error?.status;
    console.error(`[fcm] HTTP ${res.status} code=${code} msg=${errJson?.error?.message?.slice(0, 120)}`);
    if (code === "UNREGISTERED" || code === "INVALID_ARGUMENT" || res.status === 404) {
      return "invalid";
    }
    return "error";
  } catch (err) {
    console.error("[fcm] sendFcm exception:", err instanceof Error ? err.message : String(err));
    return "error";
  }
}
