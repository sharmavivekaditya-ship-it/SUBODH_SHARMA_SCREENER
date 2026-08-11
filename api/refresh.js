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

function setupExtras(cl, hi, lo, vo) {
  const n = cl.length;
  const out = { vcp: false, htf: false, pb: false, adr: null, tov: null, setupScore: 0 };
  if (n < 25) return out;
  const last = cl[n - 1];
  const sma = (a, p) => a.length >= p ? a.slice(-p).reduce((x, y) => x + y, 0) / p : null;
  let s = 0, t = 0;
  for (let i = n - 20; i < n; i++) { s += (hi[i] - lo[i]) / cl[i]; t += vo[i] * cl[i]; }
  out.adr = s / 20 * 100;
  out.tov = t / 20 / 1e7;
  if (n < 60) return out;
  const s20 = sma(cl, 20), s50 = sma(cl, 50), s200 = n >= 200 ? sma(cl, 200) : null;
  const off52 = (last / Math.max(...cl) - 1) * 100;
  const trp = (a, b) => { let x = 0, c = 0; for (let i = n - a; i < n - b; i++) { x += (hi[i] - lo[i]) / cl[i]; c++; } return x / c * 100; };
  const atrR = trp(10, 0), atrP = trp(30, 10);
  const cl10 = cl.slice(-10);
  const range10 = (Math.max(...cl10) - Math.min(...cl10)) / last * 100;
  const v10 = sma(vo, 10), v50 = sma(vo, 50);
  out.vcp = !!(s200 != null && last > s50 && s50 > s200 && off52 >= -20 && atrR < atrP * 0.75 && v10 < v50 && range10 < 9);
  const base = cl.slice(-50, -10);
  const runGain = base.length ? (Math.max(...cl.slice(-15)) - Math.min(...base)) / Math.min(...base) * 100 : 0;
  out.htf = !!(runGain >= 40 && off52 >= -15 && range10 < 12);
  const dd = (last / Math.max(...cl.slice(-20)) - 1) * 100;
  const nearMA = (s20 && Math.abs(last - s20) / s20 < 0.03) || (s50 && Math.abs(last - s50) / s50 < 0.035);
  const r = rsi14(cl);
  out.pb = !!(s200 != null && last > s200 && s50 > s200 && dd <= -3 && dd >= -12 && nearMA && r >= 35 && r <= 60);
  out.setupScore = (out.vcp ? 4 : 0) + (out.htf ? 2 : 0) + (out.pb ? 1 : 0);
  return out;
}

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
    const cl = [], hh = [], ll = [], vv = [];
    for (let i = 0; i < d.c.length; i++) if (d.c[i] != null) {
      cl.push(d.c[i]); hh.push(d.h[i] ?? d.c[i]); ll.push(d.l[i] ?? d.c[i]); vv.push(d.v[i] || 0);
    }
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
      hi52: (last / Math.max(...cl) - 1) * 100,
      ...setupExtras(cl, hh, ll, vv)
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
