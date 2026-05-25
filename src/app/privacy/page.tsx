import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — InShorts Nepal",
  description: "How InShorts Nepal collects, uses, and protects your information.",
};

const EFFECTIVE_DATE = "May 25, 2026";

// Self-contained scrollable page: the app's <body> is overflow-hidden, so we
// render a fixed, scrollable white container that overrides it.
const wrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  overflowY: "auto",
  background: "#ffffff",
  color: "#1a1a1a",
  WebkitOverflowScrolling: "touch",
};
const inner: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  padding: "40px 22px 80px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  lineHeight: 1.7,
  fontSize: 16,
};
const h1: React.CSSProperties = { fontSize: 30, fontWeight: 800, margin: "0 0 6px" };
const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, margin: "30px 0 8px" };
const p: React.CSSProperties = { margin: "0 0 12px" };
const muted: React.CSSProperties = { color: "#666", fontSize: 14, margin: "0 0 24px" };
const li: React.CSSProperties = { margin: "0 0 8px" };
const a: React.CSSProperties = { color: "#E8152A", textDecoration: "none" };

export default function PrivacyPolicy() {
  return (
    <main style={wrap}>
      <div style={inner}>
        <h1 style={h1}>Privacy Policy</h1>
        <p style={muted}>Last updated: {EFFECTIVE_DATE}</p>

        <p style={p}>
          This Privacy Policy explains how Rocket Internet Pvt. Ltd. (&quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) collects, uses, and protects your information when you use the InShorts
          Nepal mobile application and website (the &quot;Service&quot;). By using the Service, you
          agree to the practices described below.
        </p>

        <h2 style={h2}>1. Information We Collect</h2>
        <p style={p}>
          <strong>Information you provide.</strong> If you choose to create an account, we collect
          the email address and credentials you submit. Creating an account is optional — most of
          the app works without one.
        </p>
        <p style={p}>
          <strong>Information collected automatically.</strong> When you enable notifications, we
          collect a push-notification token (a Firebase Cloud Messaging device token) so we can
          send you news alerts. We may also collect basic technical data such as app version and
          general device type for reliability and analytics.
        </p>
        <p style={p}>
          <strong>On-device data.</strong> Your reading history, saved articles, language, region,
          and topic preferences are stored locally on your device to personalize your feed. An
          anonymized summary of your topic interests may be sent to our servers solely to make the
          notifications we send more relevant. We do not collect the contents of your reading
          history as personally identifiable information.
        </p>

        <h2 style={h2}>2. How We Use Information</h2>
        <ul>
          <li style={li}>To deliver and personalize your news feed.</li>
          <li style={li}>To send push notifications (breaking news, daily digests) you opt into.</li>
          <li style={li}>To operate, maintain, secure, and improve the Service.</li>
          <li style={li}>To respond to your requests and support enquiries.</li>
        </ul>

        <h2 style={h2}>3. Push Notifications</h2>
        <p style={p}>
          Notifications are optional. You can turn them off any time from the app&apos;s Profile
          screen or from your device&apos;s system settings. If you disable them, we stop sending
          alerts and the associated push token is removed on the next send attempt.
        </p>

        <h2 style={h2}>4. How We Share Information</h2>
        <p style={p}>
          We do <strong>not</strong> sell your personal information. We share limited data only
          with service providers that help us run the Service, including:
        </p>
        <ul>
          <li style={li}>
            <strong>Google Firebase (Cloud Messaging)</strong> — to deliver push notifications.
          </li>
          <li style={li}>
            <strong>MongoDB Atlas</strong> — to store push subscriptions securely.
          </li>
          <li style={li}>Our cloud hosting provider — to run the application servers.</li>
        </ul>
        <p style={p}>
          News headlines and summaries are aggregated from third-party publishers; each story links
          back to its original source, which is governed by that publisher&apos;s own policies.
        </p>

        <h2 style={h2}>5. Data Retention</h2>
        <p style={p}>
          We keep push tokens and any account data only as long as needed to provide the Service.
          Invalid or unsubscribed tokens are deleted automatically.
        </p>

        <h2 style={h2}>6. Your Rights &amp; Data Deletion</h2>
        <p style={p}>
          You may request access to, correction of, or deletion of your data at any time. To delete
          your data or account, email us at{" "}
          <a style={a} href="mailto:info@inshortsnepal.org">
            info@inshortsnepal.org
          </a>{" "}
          with the subject line &quot;Data Deletion Request&quot;, and we will process it within 30
          days. You can also clear all locally stored data by uninstalling the app or using
          &quot;Reset Preferences&quot; in the Profile screen.
        </p>

        <h2 style={h2}>7. Children&apos;s Privacy</h2>
        <p style={p}>
          The Service is not directed to children under 13, and we do not knowingly collect personal
          information from them. If you believe a child has provided us data, contact us and we will
          delete it.
        </p>

        <h2 style={h2}>8. Security</h2>
        <p style={p}>
          We use industry-standard measures, including encryption in transit, to protect your
          information. No method of transmission or storage is 100% secure, but we work to protect
          your data.
        </p>

        <h2 style={h2}>9. Changes to This Policy</h2>
        <p style={p}>
          We may update this policy from time to time. Material changes will be posted on this page
          with a new &quot;Last updated&quot; date.
        </p>

        <h2 style={h2}>10. Contact Us</h2>
        <p style={p}>
          <strong>Rocket Internet Pvt. Ltd.</strong>
          <br />
          Butwal, Dinganagar, Rupandehi, Nepal
          <br />
          Email:{" "}
          <a style={a} href="mailto:info@inshortsnepal.org">
            info@inshortsnepal.org
          </a>
        </p>

        <p style={{ ...muted, marginTop: 40 }}>
          <a style={a} href="/terms">
            Terms of Service
          </a>{" "}
          ·{" "}
          <a style={a} href="/">
            Home
          </a>
        </p>
      </div>
    </main>
  );
}
