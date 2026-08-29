// ============================================================================
// OFFICIAL NSE INDEX RETURNS
//
// niftyindices.com publishes a daily snapshot containing the close of EVERY
// NSE index:   /Daily_Snapshot/ind_close_all_DDMMYYYY.csv
//
// Fetching that file for today and for 1D / 1W / 1M / 3M / 6M ago gives real,
// official index returns for all ~150 equity indices — no constituent proxying,
// no free-float weighting approximation.
//
// Snapshots exist only for trading days, so each target date walks backwards
// until a file is found.
// ============================================================================

const BASE = "https://www.niftyindices.com/Daily_Snapshot";
const H = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "text/csv,application/octet-stream,*/*",
  "Referer": "https://www.niftyindices.com/reports/daily-reports"
};

const pad = n => String(n).padStart(2, "0");
export const ddmmyyyy = d => `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;

/* Split a CSV line, honouring quoted fields (index names contain commas). */
function splitCsv(line) {
  const out = []; let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/* Parse a snapshot into { INDEX NAME -> close }. Column names have shifted over
   the years, so locate them by header text rather than fixed position. */
export function parseSnapshot(text) {
  if (!text || /<html/i.test(text)) return null;
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 5) return null;
  const hdr = splitCsv(lines[0]).map(h => h.replace(/"/g, "").toLowerCase());
  const ni = hdr.findIndex(h => /index\s*name|^name$/.test(h));
  const ci = hdr.findIndex(h => /closing\s*index\s*value|^close$|closing/.test(h));
  if (ni < 0 || ci < 0) return null;
  const out = {};
  for (const line of lines.slice(1)) {
    const p = splitCsv(line);
    const name = (p[ni] || "").replace(/"/g, "").trim();
    const close = parseFloat((p[ci] || "").replace(/[",]/g, ""));
    if (name && isFinite(close) && close > 0) out[name.toUpperCase()] = close;
  }
  return Object.keys(out).length > 20 ? out : null;
}

/* Fetch the snapshot for `date`, walking back up to `maxBack` days to skip
   weekends and holidays. Returns { map, date } or null. */
export async function snapshotNear(date, maxBack = 8) {
  for (let i = 0; i < maxBack; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    try {
      const r = await fetch(`${BASE}/ind_close_all_${ddmmyyyy(d)}.csv`, { headers: H });
      if (!r.ok) continue;
      const map = parseSnapshot(await r.text());
      if (map) return { map, date: d.toISOString().slice(0, 10) };
    } catch (_) { /* try previous day */ }
  }
  return null;
}

export const LOOKBACKS = [
  { key: "d1", label: "1D", days: 1 },
  { key: "w1", label: "1W", days: 7 },
  { key: "m1", label: "1M", days: 30 },
  { key: "m3", label: "3M", days: 91 },
  { key: "m6", label: "6M", days: 182 }
];

/* Build official returns for every index across all five windows. */
export async function indexReturns(now = new Date()) {
  const latest = await snapshotNear(now);
  if (!latest) return null;
  const base = new Date(latest.date);

  const past = {};
  await Promise.all(LOOKBACKS.map(async lb => {
    const t = new Date(base);
    t.setDate(t.getDate() - lb.days);
    past[lb.key] = await snapshotNear(t);
  }));

  const rows = [];
  for (const [name, close] of Object.entries(latest.map)) {
    const r = { index: name, close };
    let have = 0;
    for (const lb of LOOKBACKS) {
      const p = past[lb.key] && past[lb.key].map[name];
      if (p > 0) { r[lb.key] = (close - p) / p * 100; have++; }
      else r[lb.key] = null;
    }
    if (have >= 3) rows.push(r);          // need most windows to be rankable
  }
  return {
    asOf: latest.date,
    windows: Object.fromEntries(LOOKBACKS.map(lb => [lb.key, past[lb.key] ? past[lb.key].date : null])),
    indices: rows
  };
}
