// Official NSE index returns + the "strong across timeframes" screen:
//   1-5. top N by growth over 6M / 3M / 1M / 1W / 1D
//   6.   keep indices appearing in at least MIN_HITS of those five lists
//   7.   rank survivors by RS (percentile of their blended growth)
import { indexReturns, LOOKBACKS } from "./_nse_snapshot.js";

export const config = { maxDuration: 60 };

const TOP_N = 25, MIN_HITS = 3;
// Only equity indices are interesting here — drop bond/G-Sec/money-market noise.
const EXCLUDE = /G-?SEC|GSEC|BOND|SDL|T-?BILL|CD INDEX|CP INDEX|MATURITY|DURATION|HYBRID|DEBT|MULTI ASSET|ARBITRAGE|DIVIDEND POINTS|1D RATE|PRC|AAA|AA\+|AA-|MUNICIPAL|GREEN BOND|BHARAT BOND|INVERSE|LEVERAGE|USD|FUTURES/i;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  try {
    const data = await indexReturns();
    if (!data) return res.status(502).json({ error: "NSE snapshot unavailable" });

    const all = data.indices.filter(r => !EXCLUDE.test(r.index));

    // 1-5: a top-N list per timeframe
    const tops = {};
    for (const lb of LOOKBACKS) {
      tops[lb.key] = all.filter(r => r[lb.key] != null)
        .sort((a, b) => b[lb.key] - a[lb.key])
        .slice(0, TOP_N).map(r => r.index);
    }

    // 6: how many of the five lists does each index appear in?
    const hits = {};
    for (const lb of LOOKBACKS)
      for (const name of tops[lb.key]) (hits[name] = hits[name] || []).push(lb.key);

    const survivors = all
      .filter(r => (hits[r.index] || []).length >= MIN_HITS)
      .map(r => ({ ...r, hits: hits[r.index], hitCount: hits[r.index].length }));

    // 7: RS = percentile of the blended growth, ranked among the survivors
    const W = { d1: 0.10, w1: 0.15, m1: 0.30, m3: 0.25, m6: 0.20 };
    for (const r of survivors) {
      let s = 0, w = 0;
      for (const k of Object.keys(W)) if (r[k] != null) { s += r[k] * W[k]; w += W[k]; }
      r.blend = w > 0 ? s / w : null;
    }
    const ranked = survivors.filter(r => r.blend != null).sort((a, b) => a.blend - b.blend);
    ranked.forEach((r, i) => { r.rs = ranked.length > 1 ? Math.round(i / (ranked.length - 1) * 98) + 1 : 50; });
    ranked.sort((a, b) => b.blend - a.blend);

    return res.status(200).json({
      asOf: data.asOf, windows: data.windows,
      totalIndices: all.length, topN: TOP_N, minHits: MIN_HITS,
      tops, list: ranked, ts: Date.now()
    });
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
