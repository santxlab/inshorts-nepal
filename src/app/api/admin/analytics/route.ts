import { NextResponse } from "next/server";
import { analyticsStore } from "@/lib/analytics-store";
import { adStore } from "@/lib/ad-store";
import { referralStore } from "@/lib/referral-store";
import { socialPublisher } from "@/lib/social-publisher";
import { store } from "@/lib/store";
import { installStore } from "@/lib/install-store";

export async function GET() {
  const dashboard = analyticsStore.getDashboardStats();
  const adStats = adStore.getStats();
  const referralStats = referralStore.getStats();
  const socialStats = socialPublisher.getStats();
  const articleStats = store.getStats();
  const installStats = installStore.getStats();

  return NextResponse.json({
    dashboard,
    ads: adStats,
    referral: referralStats,
    social: socialStats,
    articles: articleStats,
    installs: installStats,
  });
}
