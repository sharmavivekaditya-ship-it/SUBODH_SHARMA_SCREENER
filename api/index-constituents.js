// Constituents of a single NSE index (step 8 click-through).
// niftyindices.com filenames are inconsistent, so candidates are probed IN
// PARALLEL with a per-request timeout — sequential probing was slow enough to
// hit the function limit and leave the UI spinning forever.
import { NSE_INDEX_FILES, parseConstituents } from "./_nse_indices.js";

export const config = { maxDuration: 30 };

const H = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "text/csv,application/octet-stream,*/*",
  "Referer": "https://www.niftyindices.com/indices/equity/sectoral-indices"
};

// Snapshot names vs constituent filenames diverge for these; map explicitly.
const ALIAS = {
  "NIFTY 50": "ind_nifty50list",
  "NIFTY NEXT 50": "ind_niftynext50list",
  "NIFTY 100": "ind_nifty100list",
  "NIFTY 200": "ind_nifty200list",
  "NIFTY 500": "ind_nifty500list",
  "NIFTY MIDCAP 150": "ind_niftymidcap150list",
  "NIFTY MIDCAP 50": "ind_niftymidcap50list",
  "NIFTY MIDCAP 100": "ind_niftymidcap100list",
  "NIFTY SMALLCAP 250": "ind_niftysmallcap250list",
  "NIFTY SMALLCAP 100": "ind_niftysmallcap100list",
  "NIFTY SMALLCAP 50": "ind_niftysmallcap50list",
  "NIFTY MIDSMALLCAP 400": "ind_niftymidsmallcap400list",
  "NIFTY LARGEMIDCAP 250": "ind_niftylargemidcap250list",
  "NIFTY MICROCAP 250": "ind_niftymicrocap250_list",
  "NIFTY TOTAL MARKET": "ind_niftytotalmarket_list",
  "NIFTY INDIA DEFENCE": "ind_niftyindiadefence_list",
  "NIFTY INDIA MANUFACTURING": "ind_niftyindiamanufacturing_list",
  "NIFTY INDIA DIGITAL": "ind_niftyindiadigital_list",
  "NIFTY INDIA CONSUMPTION": "ind_niftyindiaconsumptionlist",
  "NIFTY INDIA TOURISM": "ind_niftyindiatourism_list",
  "NIFTY INDIA RAILWAYS PSU": "ind_niftyindiarailwayspsu_list",
  "NIFTY CAPITAL MARKETS": "ind_niftycapitalmarkets_list",
  "NIFTY ENERGY": "ind_niftyenergylist",
  "NIFTY INFRASTRUCTURE": "ind_niftyinfralist",
  "NIFTY COMMODITIES": "ind_niftycommoditieslist",
  "NIFTY CPSE": "ind_niftycpselist",
  "NIFTY PSE": "ind_niftypselist",
  "NIFTY MNC": "ind_niftymnclist",
  "NIFTY SERVICES SECTOR": "ind_niftyservicelist",
  "NIFTY CORE HOUSING": "ind_niftycorehousing_list",
  "NIFTY HOUSING": "ind_niftyhousing_list",
  "NIFTY MOBILITY": "ind_niftymobility_list",
  "NIFTY RURAL": "ind_niftyrural_list",
  "NIFTY TRANSPORTATION & LOGISTICS": "ind_niftytransportationlogistics_list",
  "NIFTY EV & NEW AGE AUTOMOTIVE": "ind_niftyevnewageautomotive_list",
  "NIFTY200 MOMENTUM 30": "ind_nifty200momentum30_list",
  "NIFTY500 MOMENTUM 50": "ind_nifty500momentum50_list",
  "NIFTY MIDCAP150 MOMENTUM 50": "ind_niftymidcap150momentum50_list",
  "NIFTY100 QUALITY 30": "ind_nifty100quality30list",
  "NIFTY ALPHA 50": "ind_niftyAlpha50list",
  "NIFTY100 ALPHA 30": "ind_nifty100alpha30_list",
  "NIFTY200 ALPHA 30": "ind_nifty200alpha30_list",
  "NIFTY HIGH BETA 50": "ind_niftyhighbeta50_list",
  "NIFTY50 VALUE 20": "ind_niftyvalue20list",
  "NIFTY100 EQUAL WEIGHT": "ind_nifty100EqualWeightlist",
  "NIFTY50 EQUAL WEIGHT": "ind_nifty50equalweightlist"
};

function candidates(indexName) {
  const clean = indexName.toUpperCase().replace(/\s+INDEX$/, "").trim();
  const base = clean.replace(/&/g, "and").replace(/[^A-Z0-9 ]/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const compact = base.replace(/\s+/g, "");
  const noNifty = compact.replace(/^nifty/, "");
  const set = new Set();
  for (const stem of [compact, `nifty${noNifty}`]) {
    set.add(`ind_${stem}list`);
    set.add(`ind_${stem}_list`);
  }
  set.add(`ind_nifty_${noNifty}list`);
  set.add(`ind_nifty_${noNifty}_list`);
  return [...set];
}

async function tryFile(file, ms = 6000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(`https://www.niftyindices.com/IndexConstituent/${file}.csv`,
      { headers: H, signal: ac.signal });
    if (!r.ok) return null;
    const syms = parseConstituents(await r.text());
    return syms ? { file, syms } : null;
  } catch (_) { return null; }
  finally { clearTimeout(t); }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=172800");
  const name = String(req.query.index || "").trim();
  if (!name) return res.status(400).json({ error: "index required" });
  const key = name.toUpperCase().replace(/\s+INDEX$/, "").trim();

  // exact known filename first (one fast request), then all guesses at once
  const known = NSE_INDEX_FILES[key] || ALIAS[key];
  if (known) {
    const hit = await tryFile(known);
    if (hit) return res.status(200).json({ index: name, file: hit.file, count: hit.syms.length, symbols: hit.syms });
  }
  const guesses = candidates(name).filter(f => f !== known);
  const results = await Promise.all(guesses.map(f => tryFile(f)));
  const hit = results.find(Boolean);
  if (hit) return res.status(200).json({ index: name, file: hit.file, count: hit.syms.length, symbols: hit.syms });

  return res.status(404).json({
    error: "NSE does not publish a constituent file for this index",
    index: name, tried: [known, ...guesses].filter(Boolean)
  });
}
