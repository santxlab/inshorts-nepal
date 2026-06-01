"use client";
// Live diamond balance chip for the header. Loads the server wallet on mount
// and updates instantly whenever a spend/earn broadcasts a new balance.
import { useEffect, useState } from "react";
import { getWallet } from "@/lib/diamonds-client";

export default function DiamondBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    getWallet().then((w) => { if (w) setBalance(w.balance); });
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent<number>).detail;
      if (typeof d === "number") setBalance(d);
    };
    window.addEventListener("inshorts:diamond", onEvt);
    return () => window.removeEventListener("inshorts:diamond", onEvt);
  }, []);

  if (balance === null) return null;
  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold">
      <span>💎</span>
      <span>{balance}</span>
    </div>
  );
}
