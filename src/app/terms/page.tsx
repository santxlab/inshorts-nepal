import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — InShorts Nepal",
  description: "The terms governing your use of InShorts Nepal.",
};

const EFFECTIVE_DATE = "May 25, 2026";

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

export default function TermsOfService() {
  return (
    <main style={wrap}>
      <div style={inner}>
        <h1 style={h1}>Terms of Service</h1>
        <p style={muted}>Last updated: {EFFECTIVE_DATE}</p>

        <p style={p}>
          These Terms of Service (&quot;Terms&quot;) govern your use of the InShorts Nepal mobile
          application and website (the &quot;Service&quot;), operated by Rocket Internet (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). By using the Service, you agree to these Terms. If you
          do not agree, please do not use the Service.
        </p>

        <h2 style={h2}>1. The Service</h2>
        <p style={p}>
          InShorts Nepal is a news aggregation service that presents short summaries and headlines of
          news published by third-party sources, with links to the original articles. We provide the
          Service for personal, non-commercial, informational use.
        </p>

        <h2 style={h2}>2. News Content &amp; Intellectual Property</h2>
        <p style={p}>
          News headlines, summaries, and images are sourced from third-party publishers and remain
          the property of their respective owners. We provide attribution and a link to each original
          source. The InShorts Nepal name, logo, app design, and software are our property and may not
          be copied or reused without permission.
        </p>

        <h2 style={h2}>3. Accuracy of Information</h2>
        <p style={p}>
          News is aggregated automatically and provided &quot;as is&quot; for general information. We
          do not guarantee the accuracy, completeness, or timeliness of any story and are not
          responsible for content published by the original sources. Always refer to the original
          article for the full and authoritative report.
        </p>

        <h2 style={h2}>4. Acceptable Use</h2>
        <p style={p}>You agree not to:</p>
        <ul>
          <li style={li}>Use the Service for any unlawful purpose.</li>
          <li style={li}>Attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the Service.</li>
          <li style={li}>Scrape, resell, or redistribute the content except as the Service intends.</li>
        </ul>

        <h2 style={h2}>5. Notifications</h2>
        <p style={p}>
          By enabling notifications you consent to receive news alerts. You may disable them at any
          time in the app or your device settings.
        </p>

        <h2 style={h2}>6. Disclaimers</h2>
        <p style={p}>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
          any kind, express or implied. We do not warrant that the Service will be uninterrupted,
          error-free, or secure.
        </p>

        <h2 style={h2}>7. Limitation of Liability</h2>
        <p style={p}>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
          or consequential damages arising from your use of, or inability to use, the Service or any
          third-party content accessed through it.
        </p>

        <h2 style={h2}>8. Third-Party Links</h2>
        <p style={p}>
          The Service contains links to third-party websites. We are not responsible for the content,
          policies, or practices of those sites.
        </p>

        <h2 style={h2}>9. Termination</h2>
        <p style={p}>
          We may suspend or discontinue the Service, or your access to it, at any time without notice
          if you violate these Terms.
        </p>

        <h2 style={h2}>10. Governing Law</h2>
        <p style={p}>
          These Terms are governed by the laws of Nepal, without regard to conflict-of-law principles.
        </p>

        <h2 style={h2}>11. Changes to These Terms</h2>
        <p style={p}>
          We may update these Terms from time to time. Continued use of the Service after changes
          constitutes acceptance of the revised Terms.
        </p>

        <h2 style={h2}>12. Contact</h2>
        <p style={p}>
          <strong>Rocket Internet</strong>
          <br />
          Rzone-3, Sarfabad, Noida Sector 73, Gautam Buddha Nagar — 201301
          <br />
          Email:{" "}
          <a style={a} href="mailto:info@inshortsnepal.org">
            info@inshortsnepal.org
          </a>
        </p>

        <p style={{ ...muted, marginTop: 40 }}>
          <a style={a} href="/privacy">
            Privacy Policy
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
