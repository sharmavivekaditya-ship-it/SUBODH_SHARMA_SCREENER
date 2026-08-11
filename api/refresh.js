// Background worker: computes the full market snapshot (screener metrics + intraday
// series) and stores it in Upstash Redis (free KV). Ping this every minute during
// market hours from cron-job.org — the app then loads instantly from /api/snapshot,
// even for the first visitor of the day.
const UNIVERSE = [
  "RELIANCE","HDFCBANK","ICICIBANK","INFY","TCS","BHARTIARTL","SBIN","AXISBANK",
  "KOTAKBANK","ITC","LT","HINDUNILVR","BAJFINANCE","MARUTI","M&M","SUNPHARMA",
  "NTPC","POWERGRID","TITAN","ULTRACEMCO","TATAMOTORS","TATASTEEL","JSWSTEEL",
  "ASIANPAINT","NESTLEIND","ADANIENT","ADANIPORTS","ONGC","COALINDIA","BAJAJFINSV",
  "HCLTECH","WIPRO","TECHM","GRASIM","DRREDDY","CIPLA","APOLLOHOSP","EICHERMOT",
  "HEROMOTOCO","BAJAJ-AUTO","BRITANNIA","TATACONSUM","HINDALCO","INDUSINDBK",
  "SBILIFE","HDFCLIFE","SHRIRAMFIN","TRENT","BEL","HAL","DLF","VEDL","JIOFIN",
  "PIDILITIND","AMBUJACEM","GAIL","IOC","BPCL","LICI","DMART"
];
const H = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept": "application/json" };

async function yChart(s, range, interval) {
  try {
    const sym = s.includes(".") ? s : s + ".NS";
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&includePrePost=false`, { headers: H });
    if (!r.ok) return null;
    const j = await r.json();
    const c = j.chart && j.chart.result && j.chart.result[0];
    if (!c || !c.timestamp) return null;
    const q = (c.indicators && c.indicators.quote && c.indicators.quote[0]) || {};
    const m = c.meta || {};
    return {
      t: c.timestamp, o: q.open || [], h: q.high || [], l: q.low || [], c: q.close || [], v: q.volume || [],
      meta: { prevClose: m.chartPreviousClose ?? m.previousClose ?? null, last: m.regularMarketPrice ?? null,
              name: m.shortName || m.longName || sym, high: m.regularMarketDayHigh ?? null, low: m.regularMarketDayLow ?? null }
    };
  } catch (_) { return null; }
}

function rsi14(cl) {
  const p = 14;
  if (cl.length < p + 1) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) { const d = cl[i] - cl[i - 1]; if (d > 0) g += d; else l -= d; }
  g /= p; l /= p;
  for (let i = p + 1; i < cl.length; i++) {
    const d = cl[i] - cl[i - 1];
    g = (g * (p - 1) + Math.max(d, 0)) / p;
    l = (l * (p - 1) + Math.max(-d, 0)) / p;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
const pctBack = (cl, n) => cl.length > n ? (cl[cl.length - 1] - cl[cl.length - 1 - n]) / cl[cl.length - 1 - n] * 100 : null;

export default async function handler(req, res) {
  if (process.env.REFRESH_TOKEN && req.query.token !== process.env.REFRESH_TOKEN)
    return res.status(401).json({ error: "unauthorized" });

  const trim = (d, keep = 160) => {   // last ~2 sessions: SMA50 lookback, small payload
    const s = Math.max(0, d.t.length - keep);
    return { ...d, t: d.t.slice(s), o: d.o.slice(s), h: d.h.slice(s), l: d.l.slice(s), c: d.c.slice(s), v: d.v.slice(s) };
  };
  const daily = {}, intraday = {};
  await Promise.all(UNIVERSE.map(async s => {
    const [d, i] = await Promise.all([yChart(s, "1y", "1d"), yChart(s, "5d", "5m")]);
    if (d) daily[s] = d;
    if (i) intraday[s] = trim(i);
  }));

  const metrics = {};
  for (const [sym, d] of Object.entries(daily)) {
    const cl = [];
    for (let i = 0; i < d.c.length; i++) if (d.c[i] != null) cl.push(d.c[i]);
    if (cl.length < 2) continue;
    const last = d.meta.last ?? cl[cl.length - 1];
    const prev = cl[cl.length - 2]; // yesterday's close (meta.prevClose on a 1y range = a year ago!)
    const smaN = n => cl.length >= n ? cl.slice(-n).reduce((a, b) => a + b, 0) / n : null;
    const s20v = smaN(20), s50v = smaN(50), s200v = smaN(200);
    metrics[sym] = {
      sym, last, name: d.meta.name,
      d1: prev ? (last - prev) / prev * 100 : null,
      w1: pctBack(cl, 5), m1: pctBack(cl, 21), m3: pctBack(cl, 63), m6: pctBack(cl, 126), y1: pctBack(cl, 251),
      rsi: rsi14(cl),
      a20: s20v != null ? last > s20v : null, a50: s50v != null ? last > s50v : null, a200: s200v != null ? last > s200v : null,
      hi52: (last / Math.max(...cl) - 1) * 100
    };
  }

  const snap = { ts: Date.now(), metrics, intraday };
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  let stored = false;
  if (url && tok) {
    try {
      const r = await fetch(`${url}/set/mp_snap`, {
        method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: JSON.stringify(snap)
      });
      stored = r.ok;
    } catch (_) {}
  }
  return res.status(200).json({ ok: true, stored, kvConfigured: !!(url && tok), symbols: Object.keys(metrics).length, ts: snap.ts });
}
