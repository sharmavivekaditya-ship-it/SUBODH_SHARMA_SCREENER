// Constituents of a single NSE index, for the click-through in step 8.
// niftyindices.com constituent files are named inconsistently, so try a set of
// derived patterns and remember whichever works.
import { NSE_INDEX_FILES, parseConstituents } from "./_nse_indices.js";

export const config = { maxDuration: 30 };

const H = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "text/csv,application/octet-stream,*/*",
  "Referer": "https://www.niftyindices.com/indices/equity/sectoral-indices"
};

function candidates(indexName) {
  const n = indexName.toUpperCase()
    .replace(/&/g, "and").replace(/[^A-Z0-9 ]/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const compact = n.replace(/\s+/g, "");                 // "nifty auto"    -> niftyauto
  const noNifty = compact.replace(/^nifty/, "");          //                  auto
  const words = n.split(" ").filter(Boolean);
  const dashed = words.join("");
  const set = new Set([
    `ind_${compact}list`, `ind_${compact}_list`,
    `ind_nifty${noNifty}list`, `ind_nifty${noNifty}_list`,
    `ind_${dashed}list`, `ind_${dashed}_list`,
    `ind_nifty_${noNifty}list`, `ind_nifty_${noNifty}_list`
  ]);
  return [...set];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=172800");
  const name = String(req.query.index || "").trim();
  if (!name) return res.status(400).json({ error: "index required" });

  // known-good filenames first, then derived guesses
  const known = NSE_INDEX_FILES[name.toUpperCase()];
  const files = known ? [known, ...candidates(name)] : candidates(name);

  for (const f of files) {
    try {
      const r = await fetch(`https://www.niftyindices.com/IndexConstituent/${f}.csv`, { headers: H });
      if (!r.ok) continue;
      const syms = parseConstituents(await r.text());
      if (syms) return res.status(200).json({ index: name, file: f, count: syms.length, symbols: syms });
    } catch (_) { /* next candidate */ }
  }
  return res.status(404).json({ error: "constituents not found", index: name, tried: files });
}
