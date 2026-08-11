// Vercel serverless function: CORS proxy for Yahoo Finance.
// Deployed automatically when this folder is imported into Vercel.
export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !/^https:\/\/query[12]\.finance\.yahoo\.com\//.test(url)) {
    return res.status(400).json({ error: "Only Yahoo Finance URLs allowed" });
  }
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });
    const body = await r.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
    return res.status(r.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
