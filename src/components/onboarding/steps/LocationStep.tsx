"use client";
import { Province } from "@/types";
import { PROVINCES } from "@/lib/locations";

interface Props {
  province: Province | null;
  district: string | null;
  city: string | null;
  onProvince: (p: Province | null) => void;
  onDistrict: (d: string | null) => void;
  onCity: (c: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function LocationStep({ province, district, onProvince, onDistrict, onNext, onBack }: Props) {
  const selectedProv = PROVINCES.find((p) => p.id === province);
  const districts = selectedProv?.districts ?? [];

  return (
    <div className="flex flex-col h-full px-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📍</div>
        <h2 className="text-2xl font-bold text-white mb-1">Your Location</h2>
        <p className="text-white/70 text-sm">Get local news from your area</p>
        <p className="text-white/50 text-xs">आफ्नो ठाउँको समाचार पाउनुहोस्</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Province grid */}
        <div>
          <p className="text-white/70 text-sm font-medium mb-3">Select Province / प्रदेश</p>
          <div className="grid grid-cols-1 gap-2">
            {PROVINCES.map((p) => (
              <button
                key={p.id}
                onClick={() => { onProvince(p.id); onDistrict(null); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  province === p.id
                    ? "border-white bg-white/20"
                    : "border-white/20 bg-white/8 hover:bg-white/12"
                }`}
              >
                <span className="text-xl">{p.emoji}</span>
                <div className="text-left flex-1">
                  <div className="text-white font-semibold text-sm">{p.name}</div>
                  <div className="text-white/60 text-xs">{p.nameNe} • {p.capital}</div>
                </div>
                {province === p.id && <span className="text-white text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* District dropdown - shown when province selected */}
        {province && districts.length > 0 && (
          <div>
            <p className="text-white/70 text-sm font-medium mb-2">Select District (optional)</p>
            <select
              value={district ?? ""}
              onChange={(e) => onDistrict(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white text-sm appearance-none focus:outline-none focus:border-white"
            >
              <option value="" className="text-black">-- All districts --</option>
              {districts.map((d) => (
                <option key={d} value={d} className="text-black">{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="py-6 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 rounded-2xl border-2 border-white/40 text-white font-semibold"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-lg"
        >
          {province ? "Continue →" : "Skip for now →"}
        </button>
      </div>
    </div>
  );
}
