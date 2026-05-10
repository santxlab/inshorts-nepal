import { Metadata } from "next";
import { referralStore } from "@/lib/referral-store";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const ref = referralStore.getCode(code);
  return {
    title: ref
      ? `${ref.userName} invited you to InShorts Nepal`
      : "Join InShorts Nepal",
    description: "Nepal's #1 short-form news app. Get the latest news in 10 languages.",
    openGraph: {
      title: "Join InShorts Nepal 🇳🇵",
      description: "Short, sharp news from Nepal in Nepali, English & 8 more languages.",
      images: [`${BASE_URL}/icon-512.png`],
    },
  };
}

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  const ref = referralStore.getCode(code);
  const isValid = !!ref && ref.isActive;

  // Track click server-side
  if (isValid) {
    referralStore.trackEvent(code, "click", { sessionId: "web" });
  }

  const appStoreLink = process.env.NEXT_PUBLIC_APP_STORE_LINK ?? "#";
  const playStoreLink = process.env.NEXT_PUBLIC_PLAY_STORE_LINK ?? "#";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      {/* JSON-LD for deep link attribution */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "InShorts Nepal Referral",
            url: `${BASE_URL}/refer/${code}`,
          }),
        }}
      />

      <div className="text-center max-w-sm w-full">
        <div className="text-6xl mb-4">🇳🇵</div>
        <h1 className="text-3xl font-black text-white mb-2">InShorts Nepal</h1>

        {isValid ? (
          <>
            <p className="text-white/60 text-lg mb-1">
              <span className="text-white font-bold">{ref!.userName}</span> invited you!
            </p>
            <div className="my-6 px-4 py-3 rounded-2xl bg-yellow-500/20 border border-yellow-500/40">
              <p className="text-yellow-300 font-bold text-sm">
                💎 Get {20} diamonds on sign-up!
              </p>
              <p className="text-yellow-200/60 text-xs mt-1">
                Referral code: <span className="font-mono font-bold">{ref!.code}</span>
              </p>
            </div>
          </>
        ) : (
          <p className="text-white/50 mb-6">Join Nepal&apos;s best news app</p>
        )}

        <p className="text-white/70 text-base mb-8">
          Short, sharp news from Nepal in Nepali, English & 8 more languages.
          Swipe, listen, vote, earn diamonds.
        </p>

        <div className="space-y-3">
          {/* Deep link — try to open app, fallback to store */}
          <a
            href={`inshorts-nepal://refer?code=${code}`}
            className="block w-full py-4 rounded-2xl nepal-gradient text-white font-black text-lg text-center shadow-xl"
          >
            Open App
          </a>
          <a
            href={playStoreLink}
            className="block w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-sm text-center"
          >
            🤖 Download for Android
          </a>
          <a
            href={appStoreLink}
            className="block w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-sm text-center"
          >
            🍎 Download for iOS
          </a>
        </div>

        <p className="text-white/20 text-xs mt-8">
          Referral code will be applied automatically after sign-up
        </p>
      </div>

      {/* Auto-redirect script: try to deep-link, if failed show store buttons */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var code = "${code}";
            var appUrl = "inshorts-nepal://refer?code=" + code;
            var start = Date.now();
            var timeout = setTimeout(function() {
              // If app didn't open within 2s, store referral in cookie
              document.cookie = "ref_code=" + code + "; path=/; max-age=604800; SameSite=Lax";
            }, 2000);
            window.addEventListener("blur", function() { clearTimeout(timeout); });
          })();
        `
      }} />
    </div>
  );
}
