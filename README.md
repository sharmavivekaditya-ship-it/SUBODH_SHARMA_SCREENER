# Market Pulse — Live NSE Movers Dashboard

Live price charts for the main movers in the Indian market (Nifty 50 + liquid F&O names). 100% free: static HTML + free Yahoo Finance data, no API keys.

## Features
- 1–12 live charts with a smart auto-formatting grid (1×1, 2×1, 3×1, 2×2, 3×2, 4×2, 3×3, 4×3)
- Modes: Top Movers / Top Gainers / Top Losers / custom Watchlist (saved in browser)
- Auto-refresh: 30s / 60s / 2m / 5m (pauses when tab hidden)
- Ranges: 1D·5m, 5D·15m, 1M·1h, 3M·1d
- Gainers/losers ticker strip, NSE open/closed badge, prev-close reference line

## Files
- `index.html` — the entire app (no build step)
- `api/yahoo.js` — tiny serverless CORS proxy (used automatically when hosted on Vercel)

## Host it for free (recommended: Vercel)
1. Create a free account at https://vercel.com (sign in with GitHub/Google/email).
2. Install the CLI: `npm i -g vercel`
3. From this folder run: `vercel --prod`
   (accept the defaults — no framework, no build command)
4. You get a permanent free URL like `https://market-pulse-xyz.vercel.app`.

Why Vercel: the `api/yahoo.js` proxy deploys with it, so data fetching is reliable and doesn't depend on public CORS proxies. Free tier is more than enough (100GB bandwidth/mo).

### Alternative: GitHub Pages / Netlify (static only)
Push the folder to a GitHub repo → Settings → Pages → deploy from branch. Works too, but without `api/yahoo.js` the app falls back to public CORS proxies (corsproxy.io, allorigins), which can be slower or rate-limited.

### Run locally
Just open `index.html` in a browser — it uses the public-proxy fallback automatically.

## Notes
- Yahoo data is delayed ~15 min for NSE; fine for monitoring, not for order execution.
- Edit the `UNIVERSE` list at the top of `index.html` to change the stock universe.
