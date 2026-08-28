// Serves official NSE sectoral index memberships, fetched from niftyindices.com
// server-side (no CORS, no bot wall) and edge-cached for a day.
// Falls back to the bundled static map if NSE is unreachable.
import { fetchAllSectors } from "./_nse_indices.js";
import { SECTOR_MAP } from "./_sectors.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=172800");
  try {
    const sectors = await fetchAllSectors();
    const n = Object.keys(sectors).length;
    if (n >= 10) {
      const stocks = [...new Set(Object.values(sectors).flat())];
      return res.status(200).json({
        source: "nse", indices: n, stocks: stocks.length, sectors, universe: stocks, ts: Date.now()
      });
    }
    // partial / empty -> fall back
    return res.status(200).json({
      source: "fallback", indices: Object.keys(SECTOR_MAP).length,
      sectors: SECTOR_MAP, universe: [...new Set(Object.values(SECTOR_MAP).flat())],
      note: "NSE unreachable, using bundled sector map", ts: Date.now()
    });
  } catch (e) {
    return res.status(200).json({
      source: "fallback", sectors: SECTOR_MAP,
      universe: [...new Set(Object.values(SECTOR_MAP).flat())],
      note: String(e), ts: Date.now()
    });
  }
}
