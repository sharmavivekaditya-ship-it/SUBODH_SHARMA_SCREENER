// ============================================================================
// OFFICIAL NSE SECTORAL INDICES — constituent CSV filenames on niftyindices.com
// (verified reachable; each resolves to a real ind_*list.csv).
//
// These are NSE's own published index memberships, not a hand-built map, so
// sector membership and the stocks in each sector are exactly what NSE says.
// /api/nse-sectors fetches and parses these server-side and caches for a day.
// ============================================================================

// Broad / thematic / strategy indices, added so the screen covers more than the
// sectoral family. Verified filename stems.
export const NSE_EXTRA_FILES = {
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

/* Fetch constituents for an arbitrary { indexName: csvFileStem } map. */
export async function fetchByFileMap(fileMap) {
  const H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Referer": "https://www.niftyindices.com/indices/equity/sectoral-indices"
  };
  const entries = Object.entries(fileMap);
  const out = {};
  let i = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (i < entries.length) {
      const [name, file] = entries[i++];
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      try {
        const r = await fetch(`${CSV_BASE}/${file}.csv`, { headers: H, signal: ac.signal });
        if (r.ok) {
          const syms = parseConstituents(await r.text());
          if (syms) out[name] = syms;
        }
      } catch (_) { /* skip */ }
      finally { clearTimeout(t); }
    }
  }));
  return out;
}

export async function fetchAllSectors(includeExtras = true) {
  const H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Referer": "https://www.niftyindices.com/indices/equity/sectoral-indices"
  };
  const out = {};
  const entries = Object.entries(
    includeExtras ? { ...NSE_INDEX_FILES, ...NSE_EXTRA_FILES } : NSE_INDEX_FILES);
  let i = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (i < entries.length) {
      const [name, file] = entries[i++];
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      try {
        const r = await fetch(`${CSV_BASE}/${file}.csv`, { headers: H, signal: ac.signal });
        if (r.ok) {
          const syms = parseConstituents(await r.text());
          if (syms) out[name] = syms;
        }
      } catch (_) { /* skip */ }
      finally { clearTimeout(t); }
    }
  }));
  return out;
}
