"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Status = "loading" | "success" | "error";

const AUTH_KEY = "inshorts-nepal-auth";

// Inner component that uses useSearchParams — must be inside <Suspense>
function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No token found in the link. Please request a new sign-in link.");
      return;
    }

    fetch(`/api/auth/magic-verify?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          localStorage.setItem(AUTH_KEY, JSON.stringify({ user: data.user, token: data.token }));
          setStatus("success");
          setTimeout(() => router.replace("/"), 1500);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please check your connection and try again.");
      });
  }, [params, router]);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "40px 32px",
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      {status === "loading" && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <h2 style={{ margin: "0 0 8px", color: "#1a1a1a" }}>Verifying your link…</h2>
          <p style={{ color: "#777", margin: 0 }}>Please wait a moment.</p>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 8px", color: "#1a1a1a" }}>You&apos;re signed in!</h2>
          <p style={{ color: "#777", margin: 0 }}>Taking you to the app…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
          <h2 style={{ margin: "0 0 8px", color: "#1a1a1a" }}>Link invalid</h2>
          <p style={{ color: "#777", margin: "0 0 24px" }}>{message}</p>
          <a
            href="/"
            style={{
              display: "inline-block",
              background: "#e63946",
              color: "#fff",
              padding: "12px 28px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Back to App
          </a>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "24px",
      }}
    >
      <Suspense
        fallback={
          <div style={{ textAlign: "center", color: "#777" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p>Loading…</p>
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </main>
  );
}
