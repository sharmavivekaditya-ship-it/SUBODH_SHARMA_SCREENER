import { UNIVERSE, FNO, MTF3, LOTS, MTF_LEV_MAP, MIN_MTF_LEV, MTF_LEV_DEFAULT, MTF_LEV } from "./_universe.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({
    universe: UNIVERSE, fno: FNO, mtf3: MTF3, lots: LOTS,
    mtfLev: MTF_LEV_MAP, minMtfLev: MIN_MTF_LEV,
    mtfLevDefault: MTF_LEV_DEFAULT, mtfLevCustom: Object.keys(MTF_LEV).length,
    count: UNIVERSE.length
  });
}
