// Combined market data endpoint: fetches all symbols from Yahoo in parallel
// server-side and returns ONE payload. Edge-cached so repeat loads are instant.
const OK_SYM = /^[A-Z0-9&.\-^]{1,20}$/i;
const OK_TOKEN = /^[0-9a-z]{1,5}$/;

export default async function handler(req, res) {
  const syms = String(req.query.symbols || "").split(",").map(s => s.trim()).filter(s => OK_SYM.test(s)).slice(0, 80);
  const range = String(req.query.range || "1d");
  const interval = String(req.query.interval || "5m");
  if (!syms.length) return res.status(400).json({ error: "symbols required" });
  if (!OK_TOKEN.test(range) || !OK_TOKEN.test(interval)) return res.status(400).json({ error: "bad range/interval" });

  const H = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept": "application/json" };
  const out = {};
  await Promise.all(syms.map(async s => {
    const sym = s.startsWith("^") || s.includes(".") ? s : s + ".NS";
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&includePrePost=false`, { headers: H });
      if (!r.ok) return;
      const j = await r.json();
      const c = j.chart && j.chart.result && j.chart.result[0];
      if (!c || !c.timestamp) return;
      const q = (c.indicators && c.indicators.quote && c.indicators.quote[0]) || {};
      const m = c.meta || {};
      out[s] = {
        t: c.timestamp, o: q.open || [], h: q.high || [], l: q.low || [], c: q.close || [], v: q.volume || [],
        meta: {
          prevClose: m.chartPreviousClose ?? m.previousClose ?? null,
          last: m.regularMarketPrice ?? null,
          name: m.shortName || m.longName || sym,
          high: m.regularMarketDayHigh ?? null, low: m.regularMarketDayLow ?? null
        }
      };
    } catch (_) { /* skip symbol */ }
  }));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=25, stale-while-revalidate=300");
  return res.status(200).json({ data: out, ts: Date.now() });
}
