// ============================================================================
// OFFICIAL NSE SECTORAL INDICES — constituent CSV filenames on niftyindices.com
// (verified reachable; each resolves to a real ind_*list.csv).
//
// These are NSE's own published index memberships, not a hand-built map, so
// sector membership and the stocks in each sector are exactly what NSE says.
// /api/nse-sectors fetches and parses these server-side and caches for a day.
// ============================================================================

export const NSE_INDEX_FILES = {
  "NIFTY AUTO": "ind_niftyautolist",
  "NIFTY BANK": "ind_niftybanklist",
  "NIFTY CAPITAL GOODS": "ind_niftycapitalgoods_list",
  "NIFTY CEMENT": "ind_niftycement_list",
  "NIFTY CHEMICALS": "ind_niftychemicals_list",
  "NIFTY COMMERCIAL & TRANSPORT SERVICES": "ind_niftycommercialtransportservices_list",
  "NIFTY CONSTRUCTION": "ind_niftyconstruction_list",
  "NIFTY CONSUMER DURABLES": "ind_niftyconsumerdurableslist",
  "NIFTY CONSUMER SERVICES": "ind_niftyconsumerservices_list",
  "NIFTY FINANCIAL SERVICES": "ind_niftyfinancelist",
  "NIFTY FMCG": "ind_niftyfmcglist",
  "NIFTY HEALTHCARE": "ind_niftyhealthcarelist",
  "NIFTY HOSPITALS": "ind_niftyhospitals_list",
  "NIFTY HOUSING FINANCE": "ind_niftyhousingfinance_list",
  "NIFTY INSURANCE": "ind_niftyinsurance_list",
  "NIFTY IT": "ind_niftyitlist",
  "NIFTY MEDIA": "ind_niftymedialist",
  "NIFTY METAL": "ind_niftymetallist",
  "NIFTY NBFC": "ind_niftynbfc_list",
  "NIFTY OIL AND GAS": "ind_niftyoilgaslist",
  "NIFTY PHARMA": "ind_niftypharmalist",
  "NIFTY POWER": "ind_niftypower_list",
  "NIFTY PRIVATE BANK": "ind_nifty_privatebanklist",
  "NIFTY PSU BANK": "ind_niftypsubanklist",
  "NIFTY REALTY": "ind_niftyrealtylist",
  "NIFTY RETAIL": "ind_niftyretail_list",
  "NIFTY TELECOMMUNICATIONS": "ind_niftytelecommunications_list"
};

// Yahoo symbols for the handful of NSE indices it actually carries — used to
// show the real index return alongside our constituent-derived numbers.
export const NSE_INDEX_YAHOO = {
  "NIFTY BANK": "^NSEBANK",
  "NIFTY IT": "^CNXIT",
  "NIFTY PHARMA": "^CNXPHARMA"
};

const CSV_BASE = "https://www.niftyindices.com/IndexConstituent";

export function parseConstituents(text) {
  if (!text || /<html/i.test(text)) return null;
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3) return null;
  const hdr = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const si = hdr.findIndex(h => /^symbol$/i.test(h));
  if (si < 0) return null;
  const syms = lines.slice(1).map(l => {
    const parts = l.match(/("[^"]*"|[^,]*)/g).filter(x => x !== "");
    return (parts[si] || "").replace(/"/g, "").trim();
  }).filter(s => /^[A-Z0-9&\-]+$/.test(s));
  return syms.length ? syms : null;
}

export async function fetchAllSectors() {
  const H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Referer": "https://www.niftyindices.com/indices/equity/sectoral-indices"
  };
  const out = {};
  const entries = Object.entries(NSE_INDEX_FILES);
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < entries.length) {
      const [name, file] = entries[i++];
      try {
        const r = await fetch(`${CSV_BASE}/${file}.csv`, { headers: H });
        if (!r.ok) continue;
        const syms = parseConstituents(await r.text());
        if (syms) out[name] = syms;
      } catch (_) { /* skip */ }
    }
  }));
  return out;
}
