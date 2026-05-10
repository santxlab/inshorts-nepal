"use client";
import { useState, useEffect } from "react";
import { SponsoredCampaign } from "@/types";
import { recordAdShown } from "@/lib/ad-engine";

interface Props {
  campaign: SponsoredCampaign;
  onSkip?: () => void;
}

export default function SponsoredCard({ campaign, onSkip }: Props) {
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    recordAdShown(campaign.id);
  }, [campaign.id]);

  const handleClick = async () => {
    setClicked(true);
    try {
      await fetch("/api/ads/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, sessionId: "client" }),
      });
    } catch { /* ignore */ }
    window.open(campaign.landingUrl, "_blank", "noopener noreferrer");
  };

  const labelColors: Record<string, string> = {
    Sponsored: "bg-amber-600",
    Advertisement: "bg-slate-600",
    "Partner Content": "bg-purple-600",
  };

  return (
    <div
      className="news-snap-item relative w-full overflow-hidden flex flex-col"
      style={{ background: "#0c0c14" }}
    >
      {/* Background image */}
      {campaign.imageUrl && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/95" />
        </div>
      )}

      {/* Top label */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${labelColors[campaign.labelType] ?? "bg-gray-600"}`}>
          {campaign.labelType}
        </span>
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-7 h-7 rounded-full bg-black/50 text-white/60 text-sm flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-8">
        {/* Sponsor */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm">🏢</div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider">From</p>
            <p className="text-white/90 text-xs font-bold">{campaign.sponsorName}</p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-white text-2xl font-black leading-snug mb-3">
          {campaign.title}
        </h2>

        {/* Description */}
        <p className="text-white/70 text-sm leading-relaxed mb-5">
          {campaign.description}
        </p>

        {/* CTA */}
        <button
          onClick={handleClick}
          disabled={clicked}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${
            clicked
              ? "bg-white/20 text-white/50"
              : "bg-white text-black hover:bg-white/90 active:scale-[0.98]"
          }`}
        >
          {clicked ? "Opening..." : campaign.ctaText} →
        </button>

        <p className="text-white/20 text-xs text-center mt-3">
          Swipe up to continue reading news
        </p>
      </div>
    </div>
  );
}
