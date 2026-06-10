import { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { WeeklyInsightModel, IWeeklyInsight } from "@/models/WeeklyInsightModel";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=org.inshortsnepal.app";

interface Props {
  params: Promise<{ weekId: string }>;
  searchParams: Promise<{ lang?: string; ref?: string }>;
}

async function fetchInsight(weekId: string, lang: "ne" | "en"): Promise<IWeeklyInsight | null> {
  await connectDB();
  return WeeklyInsightModel.findOne({ weekId, lang }).lean<IWeeklyInsight>();
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { weekId } = await params;
  const { lang = "en" } = await searchParams;
  const insight = await fetchInsight(weekId, lang as "ne" | "en");
  if (!insight) return { title: "Weekly Insight – Inshorts Nepal" };
  return {
    title: `${insight.title} | Inshorts Nepal`,
    description: insight.shareMessage,
    openGraph: {
      title: insight.title,
      description: insight.shareMessage,
      images: insight.pages[0]?.imageUrl ? [{ url: insight.pages[0].imageUrl }] : [],
    },
  };
}

export default async function InsightLandingPage({ params, searchParams }: Props) {
  const { weekId } = await params;
  const { lang = "en", ref } = await searchParams;

  const insight = await fetchInsight(weekId, lang as "ne" | "en");
  if (!insight) notFound();

  const appDeepLink = `inshortsnepal://insight/${weekId}?lang=${lang}${ref ? `&ref=${ref}` : ""}`;
  const trackClickUrl = `${BASE_URL}/api/insights/share`;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-lg px-4 pt-10 pb-6 flex flex-col items-center gap-3">
        <div className="text-xs font-semibold tracking-widest uppercase text-red-400">
          Weekly Insight
        </div>
        <h1 className="text-2xl font-bold text-center leading-snug">{insight.title}</h1>
        <p className="text-sm text-gray-400 text-center">{insight.shareMessage}</p>
      </div>

      {/* Page previews */}
      <div className="w-full max-w-lg px-4 flex flex-col gap-4 mb-8">
        {insight.pages.map((page, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800">
            {page.imageUrl && (
              <img
                src={page.imageUrl}
                alt={page.heading}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4">
              <div className="text-xs text-red-400 font-semibold mb-1">
                {String(i + 1).padStart(2, "0")} / {insight.pages.length}
              </div>
              <h2 className="font-bold text-base mb-1">{page.heading}</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{page.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-lg px-4 pb-12 flex flex-col gap-3">
        {/* Track click + open app or Play Store */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var ref = ${JSON.stringify(ref ?? "")};
  var weekId = ${JSON.stringify(weekId)};
  if (ref) {
    fetch(${JSON.stringify(trackClickUrl)}, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, event: "click", sharedByUserId: ref }),
    }).catch(function(){});
  }
})();
            `,
          }}
        />
        <a
          href={appDeepLink}
          className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          Read in App
        </a>
        <a
          href={`${PLAY_STORE_URL}&referrer=insight_${weekId}${ref ? `_${ref}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 rounded-2xl transition-colors"
          onClick={
            ref
              ? undefined
              : undefined
          }
        >
          Download Inshorts Nepal
        </a>

        {/* Install tracking pixel — fires when user taps Download */}
        {ref && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
document.querySelectorAll('a[href*="play.google.com"]').forEach(function(el) {
  el.addEventListener("click", function() {
    fetch(${JSON.stringify(trackClickUrl)}, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: ${JSON.stringify(weekId)}, event: "install", sharedByUserId: ${JSON.stringify(ref)} }),
    }).catch(function(){});
  });
});
              `,
            }}
          />
        )}
      </div>
    </div>
  );
}
