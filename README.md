# Market Pulse Pro — NSE Trading Screen

TradingView-style live dashboard for the main movers in the Indian market. 100% free stack: static frontend + Vercel serverless + Upstash Redis + cron-job.org. No paid APIs, no keys for market data.

## Features
- Candlestick charts (TradingView's own open-source `lightweight-charts` engine) with volume, SMA20/SMA50 toggles, prev-close line, crosshair
- 1–12 charts in a perfect-square smart grid
- Screener sidebar: full universe with LTP, 1D/1W/1M/3M returns, RSI(14) — sortable columns
- Modes: Top Movers / Gainers / Losers / Watchlist (persists in browser)
- Timeframes: 1D·5m, 5D·15m, 1M·1h, 3M·1d, 6M·1d, 1Y·1wk
- Click any row/chip/⤢ → fullscreen chart with zoom, pan, OHLC readout
- Auto-refresh 30s–5m; gainers/losers ticker strip; NSE session badge
- **Always-on backend**: server precomputes everything even when no tab is open — first page load is instant

## Architecture (why it's fast)
```
cron-job.org (every min, market hours)
        ↓ pings
/api/refresh  →  fetches 60 symbols from Yahoo in parallel,
                 computes returns + RSI + intraday series
        ↓ stores JSON
Upstash Redis (free KV)
        ↓ read by
/api/snapshot →  served edge-cached to every visitor (instant)
```
`/api/market` remains as live fallback for other timeframes and when KV isn't set up. No client ever makes 60 requests — worst case one, best case zero (snapshot).

## Deploy (all free)
1. **Vercel**: push this folder to GitHub → vercel.com → Import project → Deploy. Done: app + APIs live.
2. **Upstash** (free KV, ~2 min): upstash.com → create Redis database → copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` → Vercel → Project → Settings → Environment Variables → add both → Redeploy.
3. **cron-job.org** (free pinger): create account → new cron job → URL `https://YOUR-APP.vercel.app/api/refresh` → schedule: every 1 minute, Mon–Fri, 09:15–15:35 Asia/Kolkata. 
4. Visit `/api/refresh` once manually to seed the first snapshot.

Optional: set env var `REFRESH_TOKEN` in Vercel and append `?token=YOURTOKEN` to the cron URL to stop strangers triggering refreshes (if set, remove the `crons` entry in `vercel.json`, since Vercel's own cron doesn't send the token).

Without steps 2–3 the app still works — it just computes live on page load (a second or two slower).

## Files
- `index.html` — entire frontend
- `api/market.js` — combined live-quotes endpoint (one request for N symbols)
- `api/refresh.js` — background snapshot worker
- `api/snapshot.js` — serves the precomputed snapshot
- `vercel.json` — daily backstop cron (Vercel Hobby allows only daily crons; cron-job.org does the per-minute work)

## Notes
- Yahoo NSE data is delayed ~15 min; fine for monitoring, not order execution.
- Edit `UNIVERSE` in `index.html` **and** `api/refresh.js` to change the stock list.
- Free-tier headroom: Upstash 10k commands/day (cron uses ~400), Vercel 1M function invocations/mo.
