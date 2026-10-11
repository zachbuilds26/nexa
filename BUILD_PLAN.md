# Nexa - Master Build Plan

**Source of truth for the build.** Every workstream starts and finishes against this document.
Update checkboxes as we go. Log all friction in `docs/FRICTION.md` (that log becomes 25% of our score).

- **Product:** Nexa - a DeFi terminal for tokenized stocks (bStocks) on BNB Smart Chain: **Trade Â· Earn Â· Borrow**
- **Hackathon:** BNB Hack: Tokenized Stocks Edition Â· submissions lock **Sun Oct 11, 2026 12:00 UTC** Â· judging Oct 12â€“23
- **Entry:** separate team entry from Mandate
- **Status:** ðŸŸ¡ Planning complete â†’ Day 1 scaffold

---

## 1. How we get judged (drives every priority)

| Criterion | Weight | What wins it | Where it lives in this plan |
|---|---|---|---|
| Technical implementation | 30% | Real Venus contract integration (our own viem code), real swap execution, real RWA data pipeline | Workstreams C, D, E |
| Creativity & originality | 25% | 24/7 spread ticker (on-chain vs reference price), market-hours context, three pillars unified in one terminal | Â§4.4 signature moves |
| **Developer Experience Report** | **25%** | Honest friction log + a stranger can clone-and-run from README | Â§10 |
| Product quality & UX | 20% | category-leading polish: dark terminal, every state handled, fast, mobile-ok | Â§4 design system, Workstream G |

**Stack specials (extra $2k each):** skipped per decision - no agent. All energy on the three pillars.

**Judges will:** open repo, open deployed link, run it. Repo + demo + deployed link must stay up through Oct 23.

---

## 2. Product scope

### In scope (the three pillars)

1. **Trade** - buy/sell supported bStocks with USDT/USDC/BNB. Instant swap, live price, market open/closed status, spread ticker.
2. **Borrow** - deposit a supported bStock as collateral on **Venus**, borrow USDT without selling. Health meter, top-up, repay, withdraw collateral.
3. **Earn** - put capital to work across BNB DeFi: supply USDT to Venus, supply bStocks to Native Credit Pool, or LP on PancakeSwap - ranked by real APY, one-click deposit.
4. **Portfolio** - unified read: balances, open borrow position, earn positions, health.

### Explicitly OUT (scope creep guard)

- âŒ Perps, leverage trading, limit orders (v1)
- âŒ Custom lending/vault contracts (protocols already exist - Venus/Lista/Native)
- âŒ Agent / MCP / Telegram (decided: skip)
- âŒ Multi-chain, fiat on-ramp, mobile native app
- âŒ Ondo/xStocks cross-asset arb (bStocks only for v1; design keeps door open)

### Universe

- **87 bStocks** from RWA API (`type=3`), example: MUB `0xcdf2f3e0fa43c47a6662a91c9e4a7c5f69762699`
- Borrow pillar only shows tokens **actually listed** as Venus/Lista collateral (verified on-chain Day 3)
- Trade shows all with DEX liquidity; Earn shows venues that accept the asset

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | API routes = RWA proxy (CORS), Vercel deploy, standard judging expectation |
| Styling | **Tailwind CSS v4** (`@theme` tokens) | Same system we studied; tokens in one block |
| Fonts | **@fontsource/montserrat** (400/500/600/700) + system fallback | Self-hosted, no Google CDN, matches spec |
| Icons | **Monoline SVG (Lucide-react or inline)**, stroke 1.7, `currentColor` | No emoji icons, no icon-font payload |
| Data fetch | **TanStack Query** | Caching, refetch intervals for live prices |
| Chain reads | **viem + public BSC RPC** (`https://bsc.publicnode.com`) | No key needed, fast |
| Chain writes | **wagmi v2** + injected/Binance Wallet connector | Browser signing, standard |
| Charts | **lightweight-charts** (P2) / inline SVG sparklines (P0) | Token detail view |
| Wallet | **Binance Wallet** primary (inject target to verify Day 1), MetaMask/injected fallback | "Binance Wallet in the stack" is a judging box |
| Server | Next.js route handlers only (no separate backend) | Fewest moving parts |
| Deploy | **Vercel** (free tier fine) | Instant preview URLs |
| Runtime | Node 22 LTS, npm | Same as Mandate |

**Key addresses (verify on-chain Day 3 - do not trust memory):**

| Thing | Value | Verify via |
|---|---|---|
| USDT (BSC) | `0x55d398326f99059fF775485246999027B3197955` | âœ… confirmed in prior research |
| Venus Core Pool Unitroller | `0xfD36E2c2a6789Db23113685031d7F16329158384` (claimed) | `getAllMarkets()` on BscScan before Day 3 |
| Venus bStock vTokens | **unknown - enumerate** | filter `getAllMarkets()` by underlying âˆˆ 87 bStock addresses |
| Lista / Native (fallback) | discover Day 3 | protocol docs |
| bStock addresses | runtime from RWA API | universe endpoint |

---

## 4. Design system (Nexa identity - own brand, chosen visual system)

*Nothing in code, docs, or commits references any other site.*

### 4.1 Tokens (Tailwind `@theme`)

```css
--color-bg:        #0a0b0d   /* page + fixed header */
--color-surface-1: #0c0c0c   /* modals, dropdowns */
--color-surface-2: #0d0d0d   /* cards */
--color-surface-3: #15161a   /* elevated panels, rings */
--color-surface-4: #1c1c20   /* controls */
--color-surface-hover: #232328
--color-text:      #e9e9ec   /* primary ("white") */
--color-text-dim:  #bfbfbf   /* secondary */
--color-accent:    #86dc57   /* Nexa accent - max 2 visible uses/screen */
--color-accent-hover: #9ce676 /* hover */
--color-btn-grey:  #262626
--color-success:   #34d399   /* emerald-400, up numbers */
--color-danger:    #fb7185   /* rose-400, down numbers / risk */
--color-border:    rgb(233 233 236 / 0.06)   /* THE house border: white/6% */
--color-border-strong: rgb(233 233 236 / 0.08)
--color-hover-fill: rgb(233 233 236 / 0.04)
```

- **Body:** `background #0a0b0d`, `color #e9e9ec`, scrollbar thumb `#82848e`
- **Fonts:** `--font-sans: Montserrat, sans-serif` globally (the `*` rule); mono = ui-monospace stack for numbers where tabular matters
- **Numbers:** `font-variant-numeric: tabular-nums` on all prices/amounts

### 4.2 Component inventory (build once, reuse everywhere)

| Component | Spec |
|---|---|
| Header | `fixed top-0 z-50 bg-#0a0b0d`, logo pill w/ hover `white/4%`, dropdown menu: `rounded-xl border white/6% bg-#0c0c0c/95 backdrop-blur shadow-black/40`, items `#bfbfbf â†’ hover #e9e9ec` on `white/4%` |
| Nav tabs | inactive `#bfbfbf`, active `#e9e9ec` + 2px underline `#86dc57` |
| Footer | `border-t white/6% px-6 py-9`, text 13px `#bfbfbf`, brand `#e9e9ec` bold 15px |
| Card | `bg-#0d0d0d border white/6% rounded-xl`, hover border `white/8%` |
| Button primary | `bg-#86dc57 text-ink font-semibold rounded-xl` â†’ hover `#9ce676` |
| Button secondary | `bg-#262626 text-#e9e9ec` â†’ hover `white/8%` |
| Button ghost | transparent, hover `bg-white/[0.04]` |
| Input | `bg-#1c1c20 border white/8% rounded-xl`, focus ring `#86dc57/40` |
| Badge (market) | open = `#34d399` dot + "Market open"; closed = `#bfbfbf` dot + "Market closed Â· on-chain trades 24/7" |
| Spread ticker | horizontal strip, `#86dc57` only on the % number when > 0.5% |
| Health meter | bar `#34d399 â†’ #fcd34d â†’ #fb7185`, label `HF 1.85` |
| Table | hairline row borders `white/6%`, hover row `white/[0.03]` |
| Toast | dark `#1c1c20`, border `white/8%`, auto-dismiss |
| Modal | `bg-#0c0c0c/95 blur border white/6% rounded-xl` |
| States | **every** async surface: loading skeleton, empty, error w/ retry, success, disabled |

### 4.3 Layout

- Max width `1536px` (2xl), px-4/px-8, 8px spacing grid
- Route structure: `/` overview Â· `/trade` Â· `/earn` (list) + `/earn/[pool]` (deposit/withdraw detail) Â· `/borrow` (list) + `/borrow/[market]` (supply/borrow detail) Â· `/portfolio` - listâ†’detail split follows the category-standard pool â†’ pool/info pattern (studied Oct 7)
- Mobile: bottom nav bar (`bg-#15161a`, 4 items) under 640px; tables â†’ stacked cards

### 4.4 Signature moves (creativity score)

1. **Live spread strip** on Trade: `ON-CHAIN $1081.09 Â· NASDAQ $1076.42 Â· +0.43%` - updates on refetch, explicit "frozen reference" state when US market closed
2. **24/7 honesty:** market-closed badge frames it as a feature ("reference frozen, token keeps trading")
3. **Multiplier note:** "your balance grows automatically - dividends are applied on-chain via the multiplier"

---

## 5. Architecture

```
Browser (Next.js)
 â”œâ”€ TanStack Query â”€â”€â–º /api/rwa/*  â”€â”€proxyâ”€â”€â–º binance.com bapi (RWA data)
 â”œâ”€ viem (read) â”€â”€â”€â”€â”€â–º public BSC RPC (balances, Venus state, pool state)
 â”œâ”€ wagmi (write) â”€â”€â”€â–º Binance Wallet / injected â”€â”€â–º Binance Web3 router 0xB444â€¦ (swap calldata from Trading API)
 â”‚                                            â””â”€â”€â–º Venus vTokens (supply/borrow/repay)
 â””â”€ Agentic Wallet CLI (server-side, Earn deposit flows that lack a paved web path)
```

### Folder structure

```
nexa/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ layout.tsx              # fonts, theme, header/footer mount
â”‚   â”œâ”€â”€ page.tsx                # overview: hero, pillar cards, live stats
â”‚   â”œâ”€â”€ trade/page.tsx
â”‚   â”œâ”€â”€ earn/page.tsx
â”‚   â”œâ”€â”€ borrow/page.tsx
â”‚   â”œâ”€â”€ portfolio/page.tsx
â”‚   â””â”€â”€ api/
â”‚       â”œâ”€â”€ rwa/universe/route.ts     # 87 bStocks + liquidity
â”‚       â”œâ”€â”€ rwa/dynamic/route.ts      # price, multiplier, status (per addr, cached 15s)
â”‚       â”œâ”€â”€ rwa/status/route.ts       # market open/closed
â”‚       â””â”€â”€ rwa/kline/route.ts        # candles for detail chart
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ layout/  (Header, Footer, MobileNav)
â”‚   â”œâ”€â”€ ui/      (Button, Card, Badge, Input, Modal, Toast, Skeleton, Tabs, HealthMeter, SpreadTicker)
â”‚   â”œâ”€â”€ trade/   (SwapCard, TokenList, MarketBadge, PriceHeader)
â”‚   â”œâ”€â”€ borrow/  (CollateralCard, BorrowCard, PositionCard, RiskBanner)
â”‚   â”œâ”€â”€ earn/    (YieldList, VenueCard, DepositModal)
â”‚   â””â”€â”€ portfolio/ (BalancesTable, PositionsSummary)
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ rwa.ts           # fetchers + types + spread math + null-reference handling
â”‚   â”œâ”€â”€ binanceWeb3.ts    # HMAC-signed quote/price (see Â§6.3)
â”‚   â”œâ”€â”€ binanceTrade.ts   # /swap â†’ signed tx building (see Â§6.3)
â”‚   â”œâ”€â”€ venus.ts         # ABIs, addresses, supply/borrow/repay/withdraw, HF math
â”‚   â”œâ”€â”€ erc20.ts         # balanceOf/allowance/approve helpers
â”‚   â”œâ”€â”€ format.ts        # usd/pct/amount formatters (BigNumber-safe: bigint math)
â”‚   â””â”€â”€ wagmi.ts         # config, connectors (binanceWallet target)
â”œâ”€â”€ hooks/               # usePrices, useMarketStatus, useVenusPosition, useTokenBalances
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ FRICTION.md      # append-only DX log (SCORES 25%)
â”‚   â””â”€â”€ SCREENSHOTS/     # for demo + DX report
â”œâ”€â”€ .env.local.example
â”œâ”€â”€ README.md            # stranger-clone-and-run tested
â””â”€â”€ BUILD_PLAN.md        # this file
```

---

## 6. Integrations (the technical core)

### 6.1 RWA Data API (verified live 2026-10-02 âœ…)

All public GET, envelope `{code:"000000", data, success:true}`. Proxy through `app/api/rwa/*` (browser CORS + one place to cache).

| Route | Upstream | Notes |
|---|---|---|
| `/api/rwa/universe` | `/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=3` | 87 items: `symbol` (ticker+B), `ticker`, `contractAddress`, `multiplier` |
| `/api/rwa/dynamic?addr=` | `/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai?chainId=56&contractAddress=` | `tokenInfo.price` (on-chain, always live), `stockInfo.price` (**null when US closed**), `sharesMultiplier`, `priceChangePct24h` |
| `/api/rwa/status` | `.../rwa/market/status/ai` | overall regime premarket/regular/postmarket/closed |
| `/api/rwa/kline` | `.../dex/market/token/kline/ai?interval=1h&limit=300` | `[openTime, o, h, l, c, vol, closeTime]` |

**Hard rules (from research):**
1. `sharePrice = tokenInfo.price Ã· multiplier` - multiplier changes daily (dividends); never cache across days
2. `stockInfo.price` can be **null in ANY regime** â†’ keep last-known non-null, render "reference frozen at $X (age)"
3. All USD values are **strings** â†’ `bigint`/decimal math, **never float**
4. Cache dynamic 15s (TanStack `staleTime`), status 30s, universe 1h

**Spread:** `spread = (tokenPrice / multiplier âˆ’ lastReference) / lastReference` - show signed, color green/rose.

### 6.2 Wallet

- wagmi `injected()` with explicit Binance Wallet target - **verify connector id Day 1** (`window.binance` vs standard EIP-1193; docs: web3.binance.com). Fallback: generic injected (MetaMask works with Binance Wallet too).
- Chain: BSC 56, `chains: [bsc]`, show "wrong network" banner with switch button.
- Connect button in header; show address + balance pill; disconnect in dropdown.
- **Never** touch private keys - wallet signing only.

### 6.3 Trade (Workstream C)

**Goal:** USDT/USDC/BNB â‡„ bStock, quote in <1s, execute via wallet, visible tx status.

Decision tree (tested Day 2 - **Path A chosen and verified end-to-end server-side**):

| Path | How | Status |
|---|---|---|
| **A (CHOSEN)** | **Binance Web3 Trading API** - signed `GET /quote` â†’ `GET /swap` returns ready-to-sign `tx` {to,data,value} â†’ wallet sends. Both buy+sell return `executionMode=SWAP` via LiquidMesh/Rfq Neptunex; `approveTarget` from quote drives ERC-20 approve | âœ… verified live: quote, swap calldata, approve calldata all `code:0` |
| B (deleted) | ~~PancakeSwap Unified Swap API~~ - removed per hackathon "use Binance API" requirement | âŒ removed |
| C (last resort) | Server-side `baw market-order swap` CLI (documented, verified pattern) - poorer UX, shows as "assisted swap" | âœ… CLI docs in hand |

**UX flow:** token in/out selectors â†’ debounced quote (500ms) with price impact + minimum received â†’ Approve (if needed, exact amount not unlimited) â†’ Swap â†’ tx hash link â†’ success toast + balance invalidation.
**States:** quoting, quote expired (re-quote), slippage revert, insufficient balance, market status badge beside price.

### 6.4 Borrow (Workstream D) - our own Venus integration

**Flow (Core Pool):**

```
1. Supply collateral:  approve(bStock â†’ vToken) â†’ vToken.mint(amount)     [enters market]
2. Verify market:      comptroller.checkMembership(user, vToken)  (or enterMarkets([vToken]))
3. Borrow USDT:        approve? no â†’ usdtVToken.borrow(usdtAmount)
4. Repay:              approve(USDT â†’ usdtVToken) â†’ usdtVToken.repayBorrow(amount)
5. Withdraw:           vToken.redeemUnderlying(bStockAmount)   (only if HF stays > 1)
6. Read health:        comptroller.getAccountLiquidity(user)
```

**Health math (document exact formula in code comments - judges read this):**
- `getAccountLiquidity` returns `(err, liquidityUsd, shortfallUsd)` in 1e18 USD
- If `shortfall > 0` â†’ liquidatable, HF â‰¤ 1
- **HF = (borrowUsd + liquidityUsd) / borrowUsd**, where `borrowUsd = Î£ vToken.borrowBalanceStored Ã— oraclePrice` (0 borrow â†’ display "-")
- Oracle price: `comptroller.oracle â†’ getUnderlyingPrice(vToken)`, scaled **1e(36 âˆ’ underlyingDecimals)** - the classic Venus gotcha, log it in FRCTION.md too
- Per-market factor: `comptroller.marks`/`markets(vToken)` â†’ `collateralFactorMantissa`

**Day-3 verification checklist (before writing UI):**
- [ ] `getAllMarkets()` length + underlying addresses; intersect with 87 bStocks
- [ ] Confirm collateral factors per bStock market (expect 0.5â€“0.75; use actual)
- [ ] Confirm bStock vTokens allow `mint` (some markets are borrow-only)
- [ ] If Core Pool listing missing/stale â†’ **fallback ListaDAO** (announced bStock collateral; same viem pattern) - verify Day 3
- [ ] Simulate first tx with `stateOverride` or tiny amount before real

**UX flow:** pick collateral (only eligible tokens) â†’ slider/amount with max respecting target HF (default 20% LTV) â†’ borrow USDT â†’ position card with HF meter + liquidation price estimate + top-up/repay/withdraw actions. **Risk banner** at HF < 1.5.

**Test plan (mainnet, dust amounts):** $2-5 of one bStock â†’ supply â†’ borrow 1 USDT â†’ repay â†’ withdraw â†’ all green in one session (screenshot each step for DX report).

### 6.5 Earn (Workstream E)

**Venues to surface (verify availability Day 4 morning):**

| Venue | Asset | Path |
|---|---|---|
| Venus USDT supply | USDT | paved: `baw defi deposit` (if in `investment-list`) **or** direct `usdtVToken.mint` (same pattern as Borrow - likely easier, one code path) |
| Native Credit Pool | bStocks | check `investment-list`; else document "external venue" with link |
| PancakeSwap bStock/USDT LP | both | paved: `baw defi lp-add`; else router `addLiquidity` |

**Yield router UI:** cards sorted by `apyDisplay` (from `investment-list` if usable, else protocol docs values labeled "protocol-reported") â†’ amount â†’ preview (quote/APY/tx cost) â†’ deposit via chosen path â†’ position appears in Portfolio.

**Fallback ladder:** direct contract (viem) â†’ `baw defi` CLI â†’ read-only listing with outbound link. Never fake a deposit.

### 6.6 Portfolio

- Balances: `balanceOf` for watched bStocks + USDT/USDC/BNB (viem multicall)
- Borrow: from `lib/venus.ts` position read
- Earn: vToken balances (Venus) + LP balance if minted by us; complex external positions â†’ show what we can read honestly, "view on protocol" links otherwise

---

## 7. Workstreams & acceptance criteria

Each workstream = âœ… only when criteria pass. Order matters; don't start next before P0s of current are green.

### W0 - Foundation (Day 1)
- [x] `npx create-next-app` + Tailwind v4 + fontsource Montserrat + tokens per Â§4
- [x] Header/Footer/MobileNav + 5 routes render with real copy (no lorem)
- [ ] `/api/rwa/universe` returns 87 items â†’ debug table on `/` shows them
- [x] `/api/rwa/dynamic` works for 3 addresses incl. null-reference handling
- [ ] Wallet connect (Binance Wallet) shows address; wrong-network banner works ï¿½ **code ready, needs browser test**
- [x] `docs/FRICTION.md` created; README skeleton with run steps
- [ ] **Acceptance:** stranger runs `npm i && npm run dev`, sees universe + can connect

### W1 - Trade (Day 2)
- [x] Swap card: in/out tokens, amount, debounced quote, price impact, min-received
- [x] Path **Binance Web3 Trading API** (quote + swap + approve calldata verified server-side, code:0) ï¿½ browser/wallet execution test pending
- [x] Market badge (open/closed) + spread ticker live on page
- [x] Token list with price, 24h change, sparkline (SVG)
- [x] States: quoting / expired / error / insufficient / confirming / success (derived-state, lint-clean)
- [ ] **Acceptance:** buy $2 of a bStock and sell it back from our UI in one sitting

### W2 - Borrow (Day 3)
- [x] Venus markets enumerated; eligible bStocks list is REAL (from chain) - 4/87: NVDA, TSLA, SKHY, SPCX (`docs/venus-enumeration.md`, `scripts/venus-markets.mjs`)
- [ ] Supply collateral â†’ position appears
- [ ] Borrow USDT â†’ balance increases (tx link)
- [ ] Repay + withdraw collateral (with HF guard on withdraw)
- [ ] HF meter + liquidation warning + LTV slider with suggested max
- [ ] **Acceptance:** full cycle on mainnet dust: supply â†’ borrow â†’ repay â†’ withdraw, HF correct after each step vs BscScan

### W3 - Earn (Day 4)
- [x] Yield list: â‰¥2 real venues with APY (Venus USDT + one more) - **done:** Venus USDT (live per-block supply APR, measured blocksPerYear) + Native Pool USDC/USDT/QQQB (projected APY from Pool `config`), ranked by APY, `?venue=&asset=` deep-links
- [ ] Deposit flow executes for â‰¥1 venue (real tx) - **code complete both venues** (Venus approveâ†’mint pre-flight via `checkVenusAction`; Native: runtime vault discoveryâ†’emergency/pause/supported checksâ†’8-dec grid floorâ†’$10 minâ†’first-deposit activation feeâ†’`deposit(token,amt,1)`), blocked on wallet test
- [ ] Positions flow into Portfolio - **on-page done** (Venus supplied + Native `account` balances w/ lifetime yield); Portfolio is W4
- [ ] **Acceptance:** $2 deposited through UI, visible in protocol's own UI too
- Note: Native withdraw is a hand-off to `app.native.org/pool?chain=bsc` (EIP-712 flow out of scope) - never faked

### W4 - Portfolio & Overview (Day 4, after W3)
- [x] Balances, borrow position, earn positions, net worth (USD) - **done:** net-worth strip (wallet + supplied âˆ’ debt + earning), wallet balances table (held tokens priced via dynamic, BNB via Native markPrices), borrow card (HF meter + warnings, read-only + Manage link), shared EarnDepositsCard; disconnected states verified, connected states need wallet
- [x] Overview: hero (one sentence value prop), 3 pillar cards, live stats (universe size, market status, **spread example** = live USDTâ†’NVDAxâ†’USDT round-trip quote from the Binance aggregator, verified rendering $0.02 on $100)

### W5 - Polish (Day 5 morning)
- [x] Production build green: `next build` â†’ 19 routes (static `â—‹` for /trade /earn /borrow /stocks /portfolio, PPR `â—` for /stock/[address] + detail pages, dynamic `Æ’` for `/` via `instant = false`) - re-verified Oct 8; prerender gotchas in FRICTION #24
- [x] All async surfaces have loading/empty/error states - W5.1 audit: every query failure surfaces an ErrorBlock/error note with a working Retry; loading gates on skeletons; partial failures degrade per-section (wallet vs borrow vs earn)
- [x] Mobile pass at 375px: nav, swap card, tables - `scrollWidth == 375` on all 10 routes (wide tables intentionally inside `overflow-x-auto`); console errors = HMR websocket noise only
- [x] Numbers: tabular-nums, consistent decimals (USD 2dp, % 2dp, amounts 4dp; remaining `.toFixed` = ratios/SVG coords only; `InfoRow`/`ContextStat` wrap values in `.tnum`)
- [x] No console errors, Lighthouse â‰¥ 90 on `/` - **desktop preset: perf 90 / a11y 100 / BP 100 / SEO 100**; mobile: 70/100/100/100 (perf ceiling = 4Ã— CPU sim vs Next framework hydration; real long tasks only 214ms - FRICTION #27/#28)
- [x] Disabled buttons explain themselves (tooltips) - automated audit across 8 routes: no unlabeled/inert controls; pagination Prev/Next get state-aware titles (FRICTION #27 SWR fix also removed a multi-second SSR stall on `/`)

### W6 - Submission (Day 5 afternoon + Day 6 buffer)
- [x] README: what/why, architecture diagram, run steps, env vars, test tx links - rewritten Oct 8: verified 91-token count, ASCII architecture diagram, env block matches `.env.local.example` (dropped inert `ANTHROPIC_API_KEY`), Satoshi+Montserrat corrected
- [ ] Demo video (3â€“5 min): connect â†’ trade â†’ spread ticker â†’ borrow â†’ repay â†’ earn â†’ portfolio
- [ ] Repo pushed (public, stays up through Oct 23)
- [ ] Vercel deployed + smoke-tested in incognito
- [x] `FRICTION.md` â†’ structured DX report (template form) - `docs/DX_REPORT.md`: 15 curated entries of 31 + architecture walkthrough + "what we'd tell Day-1 us" + by-the-numbers; screenshots captured to `docs/SCREENSHOTS/` (9 states); final QA found+fixed 21 mojibake UI strings (FRICTION #29)
- [ ] **Submit forms before Oct 11 12:00 UTC** (register âœ… / submit / DX)

---

## 8. Timeline (5.5 days)

| Day | Date | Focus | Cut line if behind |
|---|---|---|---|
| D1 | Tue Oct 6 | W0 foundation + registration + API key | Cut mobile nav to Day 5 |
| D2 | Wed Oct 7 | W1 Trade | Drop sparklines â†’ static change % |
| D3 | Thu Oct 8 | W2 Borrow | Borrow = supply + read-only HF first; actions D4 |
| D4 | Fri Oct 9 | W3 Earn + W4 Portfolio | Earn = Venus USDT only (1 venue) |
| D5 | Sat Oct 10 | W5 polish + demo + README + DX draft | Trim overview animations |
| D6 | Sun Oct 11 AM | Buffer, final QA, **submit by 12:00 UTC** | - |

**Daily rhythm:** morning = verify assumption of the day (the risky thing first); afternoon = build; evening = polish + FRCTION entries. Never end a day with a broken `main`.

---

## 9. Risks & fallbacks

| # | Risk | Likelihood | Mitigation / fallback |
|---|---|---|---|
| 1 | Venus has no on-chain bStock markets (news â‰  chain) | M | Day 3 morning verify â†’ ListaDAO â†’ read-only HF demo + honest "venue pending" |
| 2 | Swap quote API (Path A) undocumented/locked | M | **RESOLVED** ï¿½ signed flow discovered + verified end-to-end, Path A is live (docs/FRICTION.md) |
| 3 | Binance Wallet connector quirks (target id) | M | generic injected connector works for all EIP-1193 wallets |
| 4 | bapi CORS / rate limits | L | server proxy (already planned) + 15s cache |
| 5 | `stockInfo.price` null surprises (eg earnings) | H (known) | last-known value + explicit "frozen" UI, never crash |
| 6 | Approval UX friction (USDT non-standard approve) | M | approve exact amount, handle `approve(0)` first pattern |
| 7 | Time overrun | H | Â§8 cut lines honored; P0 list = Trade swap + Borrow cycle + clean UI + submission docs |
| 8 | Vercel deploy issues (env, region) | L | keep API keys server-side only; preview deploy Day 2 already |

**No custom smart contracts â‡’ no deploy risk, no audit theater.** All writes go to battle-tested protocols.

---

## 10. DX friction log protocol (scores 25%)

`docs/FRICTION.md`, append-only, entry format:

```md
## [2026-10-07] Venus oracle price scaling bit me
- **Tried:** read getUnderlyingPrice, used raw number in HF math â†’ HF 10â¸
- **Cause:** Venus prices scale 1e(36-decimals), not 1e18
- **Fix:** divide by 1e(36-dec)
- **Time lost:** 45 min
- **Would help:** docs example in the endpoint reference
```

Rules:
1. Log **every** dead end, undocumented field, DNS fail, CORS fight, misleading doc - immediately, even if fixed in 2 min
2. README must be **clone-and-run**: fresh-machine test on Day 5 (fresh clone, no leftover state)
3. Final DX report = curated 10â€“15 best entries + architecture walkthrough + "what we'd tell Day-1 us"
4. Also capture screenshots of key states (`docs/SCREENSHOTS/`) for report + demo

---

## 11. Environment & secrets

```bash
# .env.local.example
BINANCE_WEB3_API_KEY=        # from web3.binance.com dev portal (Day 1)
NEXT_PUBLIC_WALLETCONNECT_ID= # optional, WalletConnect
NEXT_PUBLIC_BSC_RPC=https://bsc.publicnode.com
```
- bapi RWA endpoints are **public (no key)** - key unlocks elevated limits + swap module
- No secrets ever client-exposed except `NEXT_PUBLIC_*`
- Register form submitted Day 1: https://forms.gle/NEmy3FxYc4f5Dua47

## 12. Submission checklist (final gate)

- [ ] Register form (Nexa entry)
- [ ] API key active
- [ ] Public repo + green README (stranger-run tested)
- [ ] Vercel link live in incognito
- [ ] Demo video published (unlisted OK) - reachable through judging
- [ ] Submit form: https://forms.gle/yToDUzaDMwWnq6R6A
- [ ] DX report: https://forms.gle/EUQ39xf54GHjC2ys5
- [ ] Final self-grade against Â§1 table (fill scores before submitting)

---

*We are not building an exchange from scratch - we are building the terminal that makes three existing BSC protocols usable together for tokenized stocks. Everything above is already scoped to fit 5.5 days.*
