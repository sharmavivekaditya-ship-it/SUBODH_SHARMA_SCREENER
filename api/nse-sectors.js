// Serves official NSE sectoral index memberships, fetched from niftyindices.com
// server-side (no CORS, no bot wall) and edge-cached for a day.
// Falls back to the bundled static map if NSE is unreachable.
import { fetchAllSectors, fetchByFileMap } from "./_nse_indices.js";
import { discoverIndexFiles } from "./_nse_discover.js";
import { SECTOR_MAP } from "./_sectors.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=172800");
  try {
    // Walk NSE's category pages for EVERY equity index, then read each index
    // page for the constituent CSV it links to. Falls back to the static map.
    let sectors = null, source = "nse-discovered", discovered = 0;
    try {
      const files = await discoverIndexFiles();
      if (files) {
        discovered = Object.keys(files).length;
        sectors = await fetchByFileMap(files);
      }
    } catch (_) { /* fall through */ }

    if (!sectors || Object.keys(sectors).length < 20) {
      const stat = await fetchAllSectors();          // curated map
      if (!sectors || Object.keys(stat).length > Object.keys(sectors).length) {
        sectors = stat; source = "nse-static";
      }
    }

    const n = Object.keys(sectors || {}).length;
    if (n >= 10) {
      const stocks = [...new Set(Object.values(sectors).flat())];
      return res.status(200).json({
        source, discovered, indices: n, stocks: stocks.length,
        sectors, universe: stocks, ts: Date.now()
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
