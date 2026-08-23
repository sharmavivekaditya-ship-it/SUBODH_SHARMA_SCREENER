import { UNIVERSE, FNO, MTF3 } from "./_universe.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({ universe: UNIVERSE, fno: FNO, mtf3: MTF3, count: UNIVERSE.length });
}
