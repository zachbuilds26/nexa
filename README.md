# Nexa

**Trade, earn, and borrow against tokenized stocks on BNB Smart Chain.**

Tokenized US equities trade on BSC as ERC-20 tokens. Nexa is the
self-custodial app for living on that market: prices and swaps stay live around
the clock, even while the NASDAQ reference market is closed.

- **Trade** - swap between bStocks and stables through the Binance Web3
  aggregator, with live quotes and wallet-signed approvals.
- **Earn** - supply stables or bStocks to Venus and the Native pool, ranked by
  live APR or projected APY.
- **Borrow** - post a bStock as collateral on Lista Lending, borrow USDT
  against it, and watch the health factor update.
- **Portfolio** - wallet balances, borrow positions, and earn deposits in one
  net-worth view.

Nexa deploys no custom contracts and never holds funds. Every write is a
standard swap, approve, supply, or borrow signed by your own wallet.

## Quick start

Requires Node.js 20.9 or newer.

```bash
git clone https://github.com/zachbuilds26/nexa.git nexa
cd nexa
npm install
cp .env.local.example .env.local
# add DATABASE_URL from Neon (or run the Neon integration on Vercel)
npm run dev
```

On PowerShell, copy the environment file with:

```powershell
Copy-Item .env.local.example .env.local
```

Open http://localhost:3000. The root redirects to `/trade/swap`. The full
bStock universe is readable before you connect a wallet. Connect an injected
wallet (including Binance Wallet) to trade; WalletConnect appears when
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set.

## Environment

Market data works without keys. Live quotes and swaps need the Binance Web3
keys. Activity capture and the admin console need `DATABASE_URL`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string shared by the site and admin |
| `BINANCE_WEB3_API_KEY` | Signs `/api/binance` quote, swap, and approve requests |
| `BINANCE_WEB3_SECRET_KEY` | Secret paired with the key above |
| `NEXT_PUBLIC_BSC_RPC` | Optional BSC RPC override; defaults to `https://bsc.publicnode.com` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect connector |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for link previews and OG metadata |
| `NEXT_PUBLIC_ADMIN_URL` | Admin console origin for the notification bell and maintenance banner |

The public RWA market-data endpoints do **not** use the Binance Web3 key. That
key is only for the trading aggregator.

On Vercel, install the Neon integration and connect it to the project. It
injects `DATABASE_URL` into production, preview, and development automatically.

## Routes

| Route | What it does |
|---|---|
| `/trade/swap` | Quote and execute a swap |
| `/trade/chart` | Full-size bStock chart |
| `/stocks` | Sortable bStock universe |
| `/stocks/[address]` | Stock detail, chart, market status, and fundamentals |
| `/earn/pools` | Venus and Native pools ranked by live yield |
| `/earn/deposits` | Your earn positions |
| `/earn/[key]` | Pool detail and deposit or withdraw flow |
| `/borrow/markets` | Lista markets and borrow rates |
| `/borrow/positions` | Your borrow accounts and health factors |
| `/borrow/lista/[id]` | Lista market detail |
| `/portfolio` | Wallet, borrow, and earn totals |
| `/docs`, `/privacy`, `/terms` | Product documentation and policies |

## How it works

```text
Browser
  Next.js App Router + TanStack Query + wagmi/viem
    |
    |-- /api/rwa/*       server-side cache for Binance RWA market data
    |-- /api/binance     signed Binance Web3 aggregator proxy
    |-- /api/native      proxy for Native Pool endpoints
    |
    +-- BSC RPC ---> Lista, Venus, Native, ERC-20 contracts
    +-- Neon Postgres ---> activity, notifications, settings, audit
```

- **Reads** are proxied and cached server-side because the upstream APIs do not
  expose browser-friendly CORS headers.
- **Writes** go directly from the wallet to the protocol contracts.
- **Market data** comes from Binance public RWA and spot endpoints. The Web3
  API key is used only for aggregator quotes and swaps.

### Data notes

- 24h price, change, and volume come from batched Binance spot tickers.
- 1h change comes from per-token bapi candles; market cap and fundamentals come
  from per-token bapi dynamic data.
- Binance does not publish every metric for every bStock, and transient bapi
  failures appear as `-`. Retrying the page can fill transient gaps; a missing
  upstream metric stays `-`.

## Database

Nexa stores operational state in Neon Postgres. The schema is created
idempotently on the first database call, so there is no migration command to
run. Both the site and admin use the same `DATABASE_URL`.

| Table | Contents |
|---|---|
| `activity` | Quote, swap, approve, deposit, and borrow events |
| `notifications` | Published feed shown in the site bell |
| `settings` | Maintenance mode and seed markers |
| `audit` | Admin logins, settings changes, and notification edits |

Activity older than 90 days is pruned automatically; audit keeps the newest 500
rows. The old local `data/activity.jsonl` and `admin/data/db.json` files are not
read or migrated.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router with `cacheComponents`, React 19, TypeScript |
| Styling | Tailwind CSS v4 tokens; Sora and Montserrat via Fontsource |
| Client data | TanStack Query |
| Wallet and chain | wagmi, viem, injected connectors, optional WalletConnect |
| Market data | Binance RWA bapi + Binance spot tickers |
| Trading | Binance Web3 aggregator |
| Lending and yield | Lista Lending, Venus Core, Native Pool |
| Persistence | Neon Postgres via `@neondatabase/serverless` |
| Admin | Separate Next.js console on port 3001, sharing the same database |

## Project layout

```text
app/            App Router pages + /api/rwa/* + /api/binance + /api/native
components/     layout/, ui/, trade/, borrow/, earn/, portfolio/, stock/, wallet/
hooks/          data and protocol hooks
lib/            RWA cache, spot tickers, protocol adapters, wagmi, DB, formatting
scripts/        logo refresh and one-off protocol probes
docs/           DX notes and Venus market enumeration
admin/          operations console (port 3001)
```

## Development

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

`node scripts/fetch-logos.mjs` refreshes `public/tokens/`. Probe scripts read the
universe endpoint on port 3000; set `UNIVERSE_URL` to point elsewhere.

Trading, depositing, and borrowing need a wallet with BNB. Every page is fully
explorable read-only without one, and every action states why it is disabled
until a wallet is connected.

## Social preview

The OG image is generated by `app/opengraph-image.tsx` at 1200x630. To use a
custom image, replace it with `app/opengraph-image.png` at the same size.

## Admin console

`admin/` is a separate Next.js app on port 3001. It reads site activity from
Postgres, publishes the notification feed, and toggles the maintenance banner.
It must use the same `DATABASE_URL` as the root app.

```bash
cd admin
npm install
npm run dev
```

Create `admin/.env.local` with:

```bash
ADMIN_PASSWORD=
SESSION_SECRET=
DATABASE_URL=
# Optional - defaults to http://localhost:3000
NEXA_API_URL=
```

Open http://localhost:3001 and sign in with `ADMIN_PASSWORD`. Set
`NEXT_PUBLIC_ADMIN_URL=http://localhost:3001` in the root `.env.local` to
enable the bell and maintenance banner on the site.

Admin checks: `npm run typecheck` and `npm run build` from `admin/`.

## Deployment

The root app deploys to Vercel; the admin console is intentionally separate.
Install the Neon integration on the Vercel project so `DATABASE_URL` is present
for production, preview, and development builds, then run `vercel --prod` or
push to the connected Git branch.
