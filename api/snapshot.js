// Serves the precomputed market snapshot stored by /api/refresh.
// The app reads this on load → instant data with zero client-side compute.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=120");
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !tok) return res.status(501).json({ error: "KV not configured" });
  try {
    const r = await fetch(`${url}/get/mp_snap`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) return res.status(502).json({ error: "kv read failed" });
    const j = await r.json();
    if (!j.result) return res.status(404).json({ error: "no snapshot yet — hit /api/refresh once" });
    return res.status(200).send(j.result);
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
