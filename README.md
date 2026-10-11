# Nexa

**Trade, earn, and borrow against tokenized stocks on BNB Smart Chain.**

Ninety-one US equities exist on BSC as ERC-20 tokens, priced around the clock
even while the NASDAQ reference market is closed. Nexa is the
self-custodial app for living on that market:

- **Trade** - swap between bStocks and stables at live on-chain prices through
  the Binance Web3 aggregator.
- **Earn** - supply stables or bStocks to Venus and the Native pool, with every
  venue ranked by live APY.
- **Borrow** - post a stock as collateral, borrow USDT against it, and watch
  your health factor in real time.

Every action is a standard swap, approve, supply, or borrow signed by your own
wallet. No new contracts, no custody, no lockups.

## Quick start

```bash
git clone <repo-url> nexa
cd nexa
npm install
cp .env.local.example .env.local   # market data works with no keys
npm run dev
```

Open http://localhost:3000 and the full bStock universe is live before you
connect anything. Connect **Binance Wallet** or any injected wallet to trade.

## How it works

```
┌─ Browser ────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router, PPR + connection() streaming)               │
│  TanStack Query (client data) · wagmi/viem (wallet + chain)          │
└──────┬───────────────────────────────┬───────────────────────────────┘
       │  fetch                        │  eth_call / sendTransaction
       ▼                               ▼
 /api/rwa/*  +  /api/binance           BSC RPC (bsc.publicnode.com)
 route handlers, in-memory cache,      │
 no-credentials proxy                  ├─► Venus   (lend · borrow · earn)
       │                               ├─► Native  (earn pools)
       ▼                               └─► ERC-20  (approvals · balances)
 Binance RWA API + Web3 aggregator (bapi)
 market data · reference prices · swap quotes
```

- **Reads** are cached and proxied server-side (the upstream APIs have no CORS
  and a shared rate limit).
- **Writes** go straight from the wallet to the protocol contracts. The app
  never holds keys or funds.
- Market data is public: the app runs on an empty `.env.local`. The Binance
  Web3 API keys only power the live round-trip cost on the home page.

## Environment

```bash
# .env.local.example

# Only needed for the home-page round-trip ticker (/api/binance proxy).
# Get keys at https://web3.binance.com/en/dev-portal - everything else
# works without them.
BINANCE_WEB3_API_KEY=
BINANCE_WEB3_SECRET_KEY=

# Optional - overrides the public BSC RPC used for protocol reads
NEXT_PUBLIC_BSC_RPC=https://bsc.publicnode.com

# Optional - canonical site URL for link previews (set automatically on Vercel)
NEXT_PUBLIC_SITE_URL=
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, `cacheComponents`) + TypeScript |
| Styling | Tailwind CSS v4 tokens, Space Grotesk + Montserrat (self-hosted) |
| Data | TanStack Query → `/api/rwa/*` + `/api/binance` proxies → Binance APIs |
| Chain reads | viem + public BSC RPC (`https://bsc.publicnode.com`) |
| Chain writes | wagmi v3 + injected/Binance Wallet connector |
| Protocols | Binance Web3 aggregator (swaps), Venus + Native pool (earn/borrow) - no custom contracts |

## Project layout

```
app/            routes + /api/rwa/* + /api/binance proxy handlers
components/     layout/ (chrome), ui/ (primitives), trade|borrow|earn|portfolio|home|stock/
lib/            rwa (data+cache), binanceTrade, venus, native, erc20, format, wagmi
hooks/          protocol + live-data hooks (useVenus, useYield, useEarn, useRwa…)
scripts/        one-off probes (venus enumeration, earn probe)
docs/           FRICTION.md (DX report) · venus-enumeration.md · SCREENSHOTS/
BUILD_PLAN.md   scope, workstreams, acceptance criteria
```

## Development

- `npm run dev` - dev server (Turbopack)
- `npm run lint` / `npx tsc --noEmit` / `npm run build` - verify before every commit
- Trading, depositing, and borrowing need a wallet with BNB. Every page is fully
  explorable read-only without one, and every action states why it is disabled
  until a wallet is connected.
