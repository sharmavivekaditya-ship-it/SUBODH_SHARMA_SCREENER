// ============================================================================
// AUTO-DISCOVER EVERY NSE EQUITY INDEX
//
// Hand-maintained filename maps always miss indices (and guessed filenames 404).
// Instead: walk NSE's four equity category pages, collect every index page URL,
// then read each index page for the constituent CSV it links to:
//     .../IndexConstituent/ind_niftyindiadefence_list.csv
// That yields the complete list with no guessing, and it self-updates when NSE
// launches a new index.
// ============================================================================

const SITE = "https://www.niftyindices.com";
const H = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "text/html,*/*"
};

export const CATEGORIES = [
  "broad-based-indices", "sectoral-indices", "thematic-indices", "strategy-indices"
];

// Skip non-equity and mechanically derived variants — they distort a growth screen.
const SKIP = /G-?SEC|BOND|SDL|T-?BILL|MATURITY|DURATION|HYBRID|DEBT|MULTI ASSET|ARBITRAGE|DIVIDEND POINTS|1D RATE|PRC|MUNICIPAL|INVERSE|LEVERAGE|USD|FUTURES|TR |TOTAL RETURN/i;

async function get(url, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: H, signal: ac.signal });
    return r.ok ? await r.text() : null;
  } catch (_) { return null; }
  finally { clearTimeout(t); }
}

/* Every index page URL in a category. Anchor text is unreliable, so collect the
   URLs here and read each index's real name off its own page. */
function parseCategory(html, cat) {
  const re = new RegExp(`/indices/equity/${cat}/[A-Za-z0-9\\-()%.]+`, "gi");
  return [...new Set((html.match(re) || []))].map(p => SITE + p);
}

/* Index display name from the page itself (title / h1), falling back to slug. */
function pageName(html, url) {
  let m = html.match(/<h1[^>]*>([^<]{2,90})<\/h1>/i) || html.match(/<title[^>]*>([^<|]{2,90})/i);
  let name = m ? m[1] : "";
  name = name.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (!/nifty/i.test(name)) {
    name = decodeURIComponent(url.split("/").pop())
      .replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  }
  return name.toUpperCase();
}

/* Bounded-concurrency map. */
async function pMap(items, limit, fn) {
  let i = 0;
  const out = [];
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

/* name -> constituent csv filename, for every discoverable equity index. */
export async function discoverIndexFiles() {
  const cats = await pMap(CATEGORIES, 4, async c => {
    const html = await get(`${SITE}/indices/equity/${c}`);
    return html ? parseCategory(html, c) : [];
  });
  const urls = [...new Set(cats.flat())];
  if (!urls.length) return null;

  const found = {};
  await pMap(urls, 12, async url => {
    const html = await get(url);
    if (!html) return;
    const m = html.match(/IndexConstituent\/([A-Za-z0-9_\-]+)\.csv/);
    if (!m) return;                                  // no constituent file published
    const name = pageName(html, url);
    if (!name || SKIP.test(name)) return;
    if (!found[name]) found[name] = m[1];
  });
  return Object.keys(found).length ? found : null;
}
