// Probes every RSS source URL extracted from src/lib/store.ts and reports
// status + item count. Run from the repo root: `node scripts/probe-rss.mjs`.
import fs from "node:fs";
import path from "node:path";

const storeSrc = fs.readFileSync(path.join("src", "lib", "store.ts"), "utf8");

// Pull the getDefaultSources block and extract each source entry.
const sourceBlock = storeSrc.match(/function getDefaultSources[\s\S]+?return \[([\s\S]+?)\];\s*\}/)?.[1] ?? "";
const entryRe = /\{\s*id:\s*"([^"]+)",[\s\S]*?name:\s*"([^"]+)",[\s\S]*?url:\s*"([^"]+)"/g;
const sources = [];
for (const m of sourceBlock.matchAll(entryRe)) {
  sources.push({ id: m[1], name: m[2], url: m[3] });
}

console.log(`Probing ${sources.length} sources...\n`);

const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";

async function probe(src) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(src.url, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*" },
      redirect: "follow",
    });
    clearTimeout(timer);
    const body = await res.text();
    const items = (body.match(/<item[\s>]/gi) ?? []).length;
    const entries = (body.match(/<entry[\s>]/gi) ?? []).length;
    return { ...src, status: res.status, ok: res.ok, items: items + entries, len: body.length };
  } catch (e) {
    clearTimeout(timer);
    return { ...src, status: 0, ok: false, items: 0, err: e.name === "AbortError" ? "timeout" : e.message };
  }
}

const results = await Promise.all(sources.map(probe));

const ok = results.filter((r) => r.ok && r.items > 0);
const bad = results.filter((r) => !(r.ok && r.items > 0));

console.log("=== ALIVE (status 2xx + items > 0) ===");
for (const r of ok) console.log(`  ${r.id.padEnd(22)} ${String(r.status).padEnd(4)} items=${r.items.toString().padEnd(4)} ${r.name}`);

console.log(`\n=== DEAD (${bad.length}) ===`);
for (const r of bad) console.log(`  ${r.id.padEnd(22)} ${String(r.status).padEnd(4)} ${r.err ? "err=" + r.err : "items=" + r.items} ${r.name} -> ${r.url}`);

console.log(`\nSummary: alive=${ok.length} dead=${bad.length} total=${results.length}`);
