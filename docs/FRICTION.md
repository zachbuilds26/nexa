# DX friction log - append-only, scores 25% of judging.
# Entry format: date, what we tried, cause, fix, time lost, what would have helped.

## [2026-10-06] create-next-app refuses non-empty directories
- **Tried:** `npx create-next-app .` inside the project folder (BUILD_PLAN.md already there)
- **Cause:** scaffold hard-fails on ANY existing file, not just conflicting ones
- **Fix:** scaffold into temp dir, move files out with PowerShell
- **Time lost:** 3 min
- **Would help:** a `--allow-non-empty` flag or clear docs about this behavior

## [2026-10-06] wagmi v3 renamed core hooks with only deprecation aliases
- **Tried:** wiring wallet connect with v2 muscle memory (`useAccount`)
- **Cause:** wagmi 3.x ships `useConnection` as the real API; `useAccount` is a
  deprecated re-export. `useConnect().connect` is deprecated in favor of `mutate`.
- **Fix:** read `node_modules/wagmi/dist/esm/exports/index.js` exports list before coding
- **Time lost:** 20 min of type-checking guesswork
- **Would help:** a migration guide shipped inside the package, not just on the website

## [2026-10-06] no Binance Wallet target in wagmi injected connector list
- **Tried:** `injected({ target: "binanceWallet" })` style discovery
- **Cause:** wagmi v3 dropped the curated target list (only metaMask/phantom/coinbase remain)
- **Fix:** pass a custom target object reading `window.binance`
- **Time lost:** 15 min
- **Would help:** documented EIP-1193 provider ids for regional wallets

## [2026-10-06] Next 16 `cacheComponents` silently bans `runtime` segment config
- **Tried:** `export const runtime = "nodejs"` in route handlers (harmless in Next 14/15)
- **Cause:** scaffold enables `cacheComponents: true`; route segment `runtime` conflicts with it.
  Error only appears at first request, not at save time
- **Fix:** removed the export - Node runtime is the default anyway
- **Time lost:** 25 min (chased a misleading timeout first)
- **Would help:** reject the config at scaffold time with a clear message

## [2026-10-06] Turbopack fatal panic cascades from one bad route file
- **Tried:** first request after the `runtime` error
- **Cause:** Turbopack wrote a panic log ("stale reference to an already-collected task")
  and the dev server kept listening but hung on every request - looked like a network hang
- **Fix:** restart dev server after ANY "FATAL: An unexpected Turbopack error" in stderr
- **Time lost:** 20 min
- **Would help:** dev server should exit non-zero on panic instead of serving zombies

## [2026-10-06] dev server silently binds to 3001 when 3000 is occupied
- **Tried:** curl localhost:3000 → served a DIFFERENT project's app (old dev server from
  another folder was still running); homepage "500" was actually someone else's 404
- **Cause:** Next auto-bumps ports; stderr note is easy to miss when output is redirected
- **Fix:** always read the "Local:" line from dev log; kill stale node processes
- **Time lost:** 15 min chasing a phantom bug
- **Would help:** print the chosen port prominently / fail fast if the port is taken

## [2026-10-06] Windows "slow filesystem" warning (276ms benchmark)
- **Note:** Next flags `.next/dev` as possibly a network drive; it's local AV scanning.
  First compiles took ~11s. Not fatal, but makes smoke tests feel hung - always test
  with generous timeouts first, warm cache second.


## [2026-10-06] PancakeSwap V2 `getPair` returning non-zero says NOTHING about liquidity
- **Tried:** Path B per plan � checked V2 factory `getPair(bStock, USDT)` for 4 tokens: all had pair addresses
- **Cause:** pairs auto-exist on first addLiquidity attempt / historical creation; reserves were `0,0` (MUB) or dust (NVDAB $0.025)
- **Fix:** checked PancakeSwap **V3** factory `getPool` across fee tiers + `liquidity()` � real depth found (MUB fee2500, NVDAB fee500/2500/10000)
- **Time lost:** 40 min
- **Would help:** docs should say "verify reserves, not existence" in every AMM integration guide

## [2026-10-06] PancakeSwap QuoterV2 eth_call always reverts (empty 0x), even USDT/WBNB
- **Tried:** official QuoterV2 `0xB048...997` (confirmed via official docs address table), correct selector
  `quoteExactInputSingle((address,address,uint256,uint24,uint160))` verified against the contract's own
  dispatch bytecode; struct-uint16 and flat variants rejected first
- **Cause:** never found � RPCs return `execution reverted: 0x` with zero data on binance dataseed,
  ankr, and publicnode alike; viem reports identical error for unknown selectors AND real reverts,
  making dead-end debugging indistinguishable
- **Fix:** abandoned on-chain quoter � use PancakeSwap Unified Swap API (`GET /v1/quote`, public, no key)
- **Time lost:** ~90 min
- **Would help:** (1) viem should distinguish "no code/function" from "reverted empty"; (2) RPC nodes
  should return revert reason on eth_call

## [2026-10-06] BSC USDT is 18 decimals, not 6
- **Tried:** assumed 6-decimals USDT everywhere (Ethereum habit); Pancake quote API response
  itself corrected us (path metadata says decimals: 18)
- **Cause:** BSC's USDT (0x55d3...7955) is BEP-20 with 18 decimals
- **Fix:** token decimals always read from chain/API metadata, never hard-coded
- **Time lost:** caught before it cost anything � logged because it silently breaks amount parsing
- **Would help:** common lists should flag per-chain decimals

## [2026-10-06] PancakeSwap Unified Swap API = the paved path nobody's search results rank
- **Note (positive):** `https://swap.pancakeswap.com/v1/quote` � public, no key, returns quote +
  priceImpactBps + ready-to-sign calldata (`to` + `data` + `value`) in ONE call (`includeCalldata=true`).
  Found via developer.pancakeswap.finance docs. This is the path we ship.

## [2026-10-06] Next 16 scaffold ships tsconfig `target: ES2017` � bigint literals fail tsc
- **Tried:** wrote `10n ** 18n` in lib/format.ts (plain bigint math for token units)
- **Cause:** create-next-app still emits `"target": "ES2017"`; BigInt literals require ES2020.
  Error message doesn't hint at the fix; ALSO `incremental: true` caches tsbuildinfo, so
  fixing tsconfig isn't enough � `npx tsc` keeps reporting the stale error until `.tsbuildinfo` is deleted
- **Fix:** `target: ES2020` + delete `tsconfig.tsbuildinfo`
- **Time lost:** 20 min
- **Would help:** default to ES2020 (Next runtime requires it anyway) and invalidate buildinfo on tsconfig change

## [2026-10-06] React Compiler lint (react-hooks/purity, set-state-in-effect) reshapes tx-UI architecture
- **Tried:** classic wagmi pattern � `phase` state + `useEffect` watching receipt to transition
  approving ? idle ? success
- **Cause:** Next 16 scaffold enables the new React Compiler ESLint rules: `Date.now()` in render,
  `setState` inside `useEffect`, even initial `setNow(Date.now())` in an effect are all hard errors
- **Fix:** derived-state architecture � phase eliminated entirely; UI derives from
  mutation.isPending / receipt.isLoading / receipt.isSuccess; refetches driven by
  `refetchInterval` instead of effect calls. Cleaner, but a full rewrite of the first draft
- **Time lost:** ~45 min
- **Would help:** wagmi docs showing the derived-state pattern under React Compiler rules

## [2026-10-06] Binance Web3 Trading API � signed auth solid, but quote/swap param names undocumented
- **Tried:** implement `GET /api/v1/dex/aggregator/quote` from the official docs � they list the
  endpoint but publish no query parameters anywhere searchable (docs pages are a JS SPA, llms.txt empty)
- **Cause:** parameter names are Binance-flavored, not the industry-standard names the docs' own
  examples imply: `binanceChainId` (not chainId), `amount` (not sellAmount), `fromTokenAddress`/
  `toTokenAddress` (not sellToken/buyToken � despite the endpoint being called "aggregator"),
  `approveAmount` (not amount). `/swap` additionally requires `slippagePercent` or `autoSlippage`,
  which appears in no doc page � only in the error message
- **Discovery method:** 6 round trips letting `40001 Parameter [x] is required` teach the schema
  (error messages are excellent � the docs are the problem)
- **Time lost:** ~25 min probing (would be ~0 with a params table)
- **Would help:** query-param table on the Get Quote / Execute Swap pages, or llms.txt listing them
- **Positive:** HMAC scheme sample (supported-chains page) was exact � auth worked first try;
  `/swap` returns fully-built tx {to, data, value, gas, minReceiveAmount} � better than expected

## [2026-10-07] PowerShell `Select-String -Path` treats `[address]` in paths as a wildcard
- **Tried:** `Select-String -Path 'app\stock\[address]\page.tsx' -Pattern 'SwapCard'` to find usages
- **Cause:** `-Path` (unlike `-LiteralPath`) glob-matches; `[address]` is a character class, so the
  literal folder name never matches - returns zero results and looks like "no matches in file"
- **Fix:** always `-LiteralPath` for Next.js dynamic-route folders (`[address]`, `[slug]`, …)
- **Time lost:** 5 min (misleading empty result during the swap-removal task)
- **Would help:** cmdlets should warn when a -Path pattern contains glob chars AND no match,
  but a literal sibling path exists

## [2026-10-07] viem `multicall` over a mapped contracts array degrades result types to a union
- **Tried:** typed reads over `markets.map(v => ({ address, abi, functionName, args }))` with
  `allowFailure: true` - expected per-call result types; got unions like
  `string | readonly \`0x${string}\`[]` and `string | bigint` (false positives on every cast)
- **Cause:** the inferred array type isn't const-asserted, so viem resolves outputs against the
  whole ABI's union instead of the literal `functionName` - TS2352 then blocks honest casts
- **Fix:** cast via `as unknown as T` at read sites (kept minimal, one per field)
- **Time lost:** ~10 min
- **Would help:** a viem helper (or codegen) preserving per-call types through `.map()` -
  `as const` on every element would fix it but is noise at every call site

## [2026-10-07] Playwright `getComputedStyle` visibility checks miss `opacity-0` ancestors
- **Tried:** isolating the visible segmented-tab elements by filtering
  `[...document.querySelectorAll(...)]` with `getBoundingClientRect()` + element opacity before
  `getComputedStyle` pick
- **Cause:** opacity/visibility are per-element � a child of an `opacity-0` ancestor still reports
  `opacity: 1` and a normal rect, so two extraction runs kept returning a *hidden nav
  dropdown* instead of the visible page tabs
- **Fix:** use `document.elementFromPoint(x, y)` at coordinates taken from a screenshot, then walk
  `.parentElement` � the hit-test respects ancestor opacity/pointer-events for free
- **Time lost:** ~15 min (2 full browser runs against the wrong elements)
- **Would help:** nothing to fix in the app � but `elementFromPoint` should be the default
  technique for element discovery from screenshot coordinates

## [2026-10-07] Venus exchangeRate divisor is 1e18 � NOT 1e(10 + underlyingDecimals)
- **Tried:** `vTokensToUnderlying(vTokens, rate, decimals) = vTokens * rate / 1e(10 + decimals)`
  (the decimal-adjusted Compound variant seen in several explorer/code samples)
- **Cause:** Venus keeps Compound's fixed-1e18 convention: `underlying_raw = vTokens_raw *
  rate / 1e18`. The decimal-adjusted variant is off by 1e10 for 18-decimal underlyings, so
  supplied balances read ~1e-10� reality � TVL displayed $0 and the health-factor path would
  have silently reported ~0 collateral
- **Fix:** divisor `1e18` in both directions (`vTokensToUnderlying` / `underlyingToVTokens`);
  caught before the dust test by the protocol's own accounting identity
- **Detection method (worth stealing):** assert `totalSupply * rate / 1e18 == cash + borrows -
  reserves` on-chain � matched to 1 wei on vTSLAB in one call
- **Time lost:** ~20 min (would have poisoned the entire W2 acceptance test)
- **Would help:** Venus docs stating the exchangeRate mantissa scale explicitly next to
  `exchangeRateStored` (their oracle page documents 1e(36-dec) but the rate page is silent)

## 19. Screenshot reads served stale images � verification lied to me

After removing the /borrow stat cards, three separate Playwright captures kept "showing" the wrong
page (the /trade swap card, then a skeleton state) while in-page `evaluate()` checks reported the
correct DOM (`h1: Borrow`, `hasTVL: false`, 4 rows). Two files that were byte-identical on disk
(MD5 match) displayed as different images in my reads. The PNGs were fine � the image read path
returned content cached from previously-read files, so visual verification was lying.

**Detection:** injected a visible overlay div with `Date.now()` into the page right before
`screenshot()`, logged the same timestamp, then confirmed the number rendered in the image. A
fresh filename + in-image stamp is the only screenshot read you can trust.

**Rule:** after any screenshot, verify a per-run token *visible inside the pixels* (timestamp,
page name). Cross-check PNG file hashes when two captures claim to be the same state.

Addendum to #19: re-encoding (PNG?JPG) and unique filenames did NOT bust the stale
image � the viewer kept replaying a prior image while file hashes proved fresh bytes
(three captures = three distinct hashes, all different from the replayed one). Trust
only: in-page `evaluate()` output + PNG byte hashes. Never claim visual confirmation
you didn't literally see with a matching in-image stamp.

## 20. Venus APR units: no blocksPerYear anywhere, and bStock markets are dormant

To show borrow APR on /borrow we needed rate-per-block ? APR scaling:
- Venus comptroller is a **diamond proxy** � `blocksPerYear()` reverts ("Function does not
  exist"); vTokens don't expose it either; Venus's HTTP API returned HTML (gone/blocked).
- `borrowRatePerBlock2` doesn't exist on these markets (reverts); `borrowRatePerBlock()` is
  the one that works (via typed `readContract` � raw encode/call printed garbage).
- Verified Venus accrues per **real block** (`accrualBlockNumber` tracks chain head, not
  timestamp), so APR needs the true BSC cadence � measured live: 2000 blocks / 900s =
  0.45s/block � 70.08M blocks/year (a hardcoded 10,512,000 from old docs would be 6� off).
  `measureBlocksPerYear()` caches it for 10 min; returns 0 on failure ? UI shows "�", never
  a guessed number.
- vUSDT sanity: 7.258e-10/block � 70.08M � **5.09% APR** (plausible vs Venus's own rates).
- Design catch: all four bStock markets have `totalBorrows = 0` (nobody borrows stock), so
  per-market **utilization and borrow APR would render as 0.00% everywhere** - honest but
  dead-looking. Swapped the context strip to: Market size (total supplied USD) / USDT APR
  (cost of the debt you actually take) / Your supply.

## 21. Plain-CSS rules named after Tailwind utilities are silently dropped from the bundle

We needed one rule in `globals.css`: large text sizes keep font A, everything else uses
font B. First attempt was the obvious selector list:

    .text-2xl, .text-3xl, .text-4xl, .text-5xl, .text-6xl { font-family: "Montserrat", ... }

The source file was correct, HMR reported success, lint passed - but **the rule never
appeared in the served CSS**, so every "large" heading silently rendered in the body font.

**Detection:** dumped every stylesheet the page loads and grepped it. The rule was gone
while its neighbours (`body`, `::selection`, `.tnum`) were all present - so it wasn't a
stale-cache problem, the compiler had eaten exactly that rule. `.tnum` (a class selector
that is *not* a Tailwind utility name) survived, which pointed at utility-name collision.

**Fix:** attribute-selector form, which the pipeline passes through untouched:

    [class~="text-2xl"], [class~="text-3xl"], ... { font-family: "Montserrat", ... }

(`[class~="x"]` matches whitespace-separated class tokens, so it behaves identically to
`.x` for our purposes.)

**Rule:** in this project, never write a plain-CSS rule whose selector is a Tailwind
utility class name. If you must style elements *by the utility they carry*, use
`[class~="utility-name"]`. And after adding any non-obvious CSS rule, verify it exists in
the **served** stylesheet (fetch the page's .css and grep) - a clean compile means
nothing.


## 22. Native Core API sends no CORS headers - browser calls to api.native.org/info die
- **Tried:** wiring the Earn page straight to the documented endpoints: Pool API
  (api-ui.native.org/api/v3/earn) worked from the browser, Core API (api.native.org/info,
  which serves accountStatus / markPrices / accountingDepositContracts) did not.
- **Cause:** api.native.org responds to preflights with no Access-Control-Allow-* headers,
  so Chrome blocks it (ERR_FAILED + console CORS error). That silently kills exactly the
  three calls the Native deposit path needs: vault discovery, first-deposit activation fee,
  account-status check. fetchNativeVault's catch fell back to the documented constant -
  the page "worked" while deposits would have been gated forever ("Vault unverified").
- **Detection:** Playwright console listener on /earn: `Access to fetch at
  'https://api.native.org/info' ... blocked by CORS policy`.
- **Fix:** sandboxed server proxy `POST /api/native` (app/api/native/route.ts) - forwards
  the exact body upstream, picks the upstream by `type` field, passes the response through
  unchanged (Pool API still returns HTTP 200 + code field, which the client branches on).
  lib/native.ts now posts to /api/native only.
- **Time lost:** 15 min from detection to fix (the fallback-masked failure was the scary
  part - it would have shown up as a permanent deposit block, days later).
- **Would help:** documented CORS policy per endpoint, or any endpoint returning
  Access-Control-Allow-Origin: * for keyless reads.

## 23. Number(formatUnits(x)) is NaN whenever the amount has thousands separators
- **Tried:** USD math on the Earn page: `Number(formatUnits(atoms, decimals)) * price`.
- **Cause:** our lib/format.ts formatUnits is deliberately LOCALE-formatted
  (`696,290.08` - it toLocaleStrings the whole part for display). Number("696,290.08")
  = NaN, and `(NaN || 0) * price` = 0. So Native USDC TVL ($696K) rendered as "$0"
  while QQQB ($21.6K, no separators) rendered correctly - a bug that only bites
  amounts >= 1,000, i.e. the majority of real TVLs. Two formatUnits implementations
  made it worse: viem's formatUnits (no separators, safe to parse) vs ours (display-only).
- **Detection:** live page check on /earn: stables TVL "$0" vs QQQB "$21.6K" with
  identical code paths.
- **Fix:** added `unitsToNumber(units, decimals)` to lib/format.ts (plain
  Number(units) / 10 ** decimals), replaced every Number(formatUnits(...)) in the earn
  page; lib/venus.ts position-value math migrated to the helper too (it was using viem's
  ungrouped formatUnits, so it only read as a trap, not a live bug).
- **Time lost:** 10 min.
- **Would help:** never returning display strings from a function you also parse -
  two clearly named variants (formatUnitsDisplay vs unitsToNumber) from day one.


## 24. next build hard-fails on runtime data that dev only warns about (three offender classes)
- **Tried:** first production `next build` after W4 - dev had only shown console warnings
  ("unstable value Date.now()"/"uncached data during prerendering") for weeks.
- **Cause:** Next 16 `cacheComponents` treats ANY runtime-only data read outside
  `<Suspense>` as a build-stopping error. We hit three distinct classes in one build:
  1. client pages calling `use(searchParams)` / `use(params)` at the top of the default
     export (/trade, /borrow, /earn, /stock/[address]);
  2. a server page awaiting live fetches at render time (/ - getUniverse/getMarketStatus);
  3. layout chrome calling `usePathname()` (Header, MobileNav) - this one blocked EVERY
     remaining route because the layout wraps all of them.
- **Detection:** `npm run build` itself. The stack trace is misleading - it points at
  `components/providers.tsx:8` (the Suspense-less boundary), NOT the actual offender
  line; the real offender is 2-3 frames deeper (e.g. Header.tsx:17).
- **Fix:**
  - client pages: rename default export to `XInner`, add a thin default export wrapping
    it in `<Suspense fallback={<PageFallback/>}>` (components/ui/PageFallback.tsx) - the
    promise now resolves inside a boundary, so the static shell prerenders and the page
    streams. Verified searchParams deep-links still work in production
    (`/borrow?market=0x02fca66...` selects NVDA, `/earn?venue=native&asset=usdt` chips
    Native Pool).
  - layout chrome: wrap `<Header/>`/`<MobileNav/>` in `<Suspense>` inside layout.tsx
    with geometry-preserving skeleton fallbacks (fixed bars keep their heights) so
    static shells keep their bars.
  - server page with live fetch: `export const instant = false` (the build error's
    "[block]" option) - legal on server components, THROWS on client ones; "/" now
    renders on demand with the in-memory memo keeping repeat hits fast.
- **Time lost:** 40 min across 3 build iterations (each fix surfaced the next class).
- **Would help:** failing the build with the offending LINE (not the boundary), and
  listing ALL blocking routes in one pass instead of exiting at the first.

## 25. Next 16 logs a full error stack per request for Date.now() in the prerender path - `instant = false` only fixes the BUILD
- **Tried:** production smoke of `next start` after the detail-page redesign: every
  `GET /` appended ~870 bytes of `Error: Route "/": Next.js encountered the unstable
  value Date.now() while prerendering` to stderr while the page itself served 200 with
  zero console errors. Entry 24's fix (`export const instant = false`) had silenced the
  build and dev, so the runtime log was the first sign anything was still wrong.
- **Cause:** `/` still prerenders a static shell (hero + pillars), and the shell's async
  server component executed `getUniverse()`/`getMarketStatus()` -> `lib/rwa.ts cached()`
  -> `Date.now()` before the dynamic render kicked in. The request succeeded; only the
  prerender attempt failed, loudly, every single time.
- **Detection:** truncated `prodserver.err.log`, issued `GET /`, compared file length
  (grew 1960 -> 2830), then `GET /trade` (no growth). Confirms it is per-request on `/`
  only - page-level console checks would never see it.
- **Fix:** split `app/page.tsx` per the docs recipe (`connection()` inside `<Suspense>`):
  hero pill becomes `async MarketPill()` and the LiveStats/Universe sections become
  `async HomeData()`, each starting with `await connection()`; the static shell now
  renders only skeleton fallbacks and never touches Date.now(). Verified: 3x `GET /`
  after restart = err.log growth 0, all 200, streamed content still renders.
- **Time lost:** ~25 min (isolating when it fired vs assuming it was fatal noise).
- **Would help:** a per-route "dynamic data inside a static shell" hint naming the
  offending FILE (stack pointed into minified chunks - had to bisect with log lengths).


## 26. Set-Content silently ANSI-mangles non-ASCII in verification scripts - false test failures
- **Tried:** Playwright check asserting `h1 === "USDT \u00b7 Native Pool"` written via
  PowerShell `Set-Content` heredoc; the page rendered correctly but the assertion failed.
- **Cause:** Windows PowerShell 5.1 `Set-Content` writes with the ANSI codepage, so the
  U+00B7 MIDDLE DOT in the script became '?' while the app's TSX files (real UTF-8) kept
  the real middot - regex vs page text mismatched.
- **Detection:** re-ran the check reading `h1.charCodeAt(5)` instead of comparing the
  character literally: `mid=183` (0xB7) proved the PAGE was right and the script was
  wrong. The same ASCII-safe rewrite passed immediately.
- **Fix:** write scripts with `[IO.File]::WriteAllText($path, $script, [Text.UTF8Encoding]::new($false))`,
  or avoid non-ASCII literals in test needles entirely (code points / startsWith).
- **Time lost:** ~10 min (second time this bit us - first is recorded above the 21/24
  entries).
- **Would help:** defaulting any cross-process script write to UTF-8 without BOM.


## 27. A cache that re-fetches on expiry blocks every SSR request once upstream rate-limits - serve stale, refresh in the background
- **Tried:** Lighthouse mobile perf on `/` swung between runs (LCP 2.0s vs 3.2s,
  TTFB variance) with nothing in the app changing. Timed `GET /` bursts showed warm
  requests at ~300-400ms but a multi-second stall appearing periodically.
- **Cause:** `lib/rwa.ts cachedFetch` treated an expired TTL entry (status = 30s) as a
  MISS, so the SSR request awaited a live `bapi` fetch - and the native core's 1/s rate
  limit (shared server IP) made that fetch take seconds exactly when Lighthouse
  sampled it. The score variance was upstream latency, not app code.
- **Detection:** looped 4 timed warm GETs (all fast), then paused 35s past the TTL
  boundary and timed again (830ms + stall) - correlation with the TTL isolated it.
  Lighthouse's own LCP breakdown blamed "element render delay", which was misleading
  until TTFB was measured directly.
- **Fix:** stale-while-revalidate with in-flight dedupe: fresh hit returns instantly;
  expired hit serves the stale value immediately and refreshes in the background
  (failed refresh keeps stale); only the very first fetch ever blocks. Verified: cold
  1267ms once, warm 269-416ms, post-expiry 830ms with no stall; lint/tsc/build green.
- **Time lost:** ~40 min (misleading LH attribution + TTL-boundary bisect).
- **Would help:** cache docs warning that read-through-on-expiry is the worst pattern
  for SSR under a rate-limited upstream - default should be SWR.


## 28. Lighthouse v13 renamed every insight audit + Chrome launch is flaky + PowerShell eats inline `$arr[i]` in native args
- **Tried:** batch-running three Lighthouse audits in one PowerShell loop with inline
  `$run[1]` / `'$f: '` interpolation; every run reported "FAILED" while a manual run
  immediately before/after succeeded.
- **Cause:** three stacked tooling frictions - (1) v13 renamed the insight audits
  (`lcp-breakdown` -> `lcp-breakdown-insight` etc.), so old report keys return
  `undefined`; (2) `npx lighthouse` intermittently dies with "Failed to fetch browser
  webSocket URL" (roughly 50% of launches on this box); (3) my batch script had a
  PowerShell parse error (`'$f: '` reads as a drive-letter reference) which aborted the
  ENTIRE command before any run, and bare-token array indexing in native args is
  unreliable to begin with.
- **Detection:** ran a single audit with explicit variables and it wrote the report
  fine -> batching/quoting was the bug, not Lighthouse. PS surfaced the parse error
  only after I stopped swallowing stderr (`2>$null` had hidden the real failure).
- **Fix:** one Lighthouse invocation per command with explicit `$vars`; wrap launches
  in a 3-attempt retry loop with a file-age check (deletes stale reports from prior
  runs so `Test-Path` can't lie); parse reports with node (PowerShell mangles
  hyphenated keys); never nest `$arr[i]` inside unquoted native-command arguments.
- **Time lost:** ~30 min (two full batches lost to one parse error + launch flake).
- **Would help:** Lighthouse printing a deprecation note for renamed audit IDs, and
  PowerShell refusing (loudly, per-statement) on `$var:` interpolation instead of
  failing the whole multi-command line.


## 29. Double-encoded UTF-8 shipped in 21 UI strings - grep the bytes, not the screen
- **Tried:** final W6 non-ASCII byte scan (mojibake sweep) matched a
  comment in SwapCard.tsx whose text was visibly mangled: `(?input=\u00E2\u20AC\u00A6&output=\u00E2\u20AC\u00A6)`.
- **Cause:** an earlier PowerShell-era write re-encoded the file (the #26 family):
  `…` had become `\u00E2\u20AC\u00A6` (12x), `-` had become `\u00E2\u20AC\u201D` (8x), `✓` had become `\u00E2\u0153\u0022` (1x) -
  21 occurrences total, including live CTA labels ("Connecting\u00E2\u20AC\u00A6", "Quote expired
  \u00E2\u20AC\u201D refresh") and balance cells. None were visible in any screenshot or text audit,
  because those labels only render in CONNECTED/quote states and every QA pass ran
  disconnected.
- **Detection:** searching decoded source for the LEAD CHARACTERS U+00E2 / U+00C3 -
  the codebase has no legitimate French accents, so any hit is corruption. An
  82-file scan pinpointed SwapCard.tsx as the only infected file.
- **Fix:** built every replacement from explicit char codes (`[char]0x2026`,
  `[char]0x2014`, `[char]0x2713`) and wrote with `WriteAllText(..., UTF8 no-BOM)` -
  no literal non-ASCII ever enters the shell (per entry #26). Rebuilt, restarted
  prod, then `evaluate()` over 8 routes: `TOTAL_BAD=0` rendered chars,
  `CONSOLE_ERRORS=0`.
- **Time lost:** ~20 min (and a standing risk period - the labels had shipped in
  earlier builds without anyone noticing).
- **Would help:** a CI/lint step failing on U+00E2/U+00C3 anywhere in source
  (one regex, catches the whole mojibake class); and QA passes that include at
  least one CONNECTED-state capture, since disconnected screens never exercise
  progress/error labels.


## 30. Em-dash sweep: verification is blind in the console, and one Edit broke a string literal
- **Tried:** removing em dashes (the loudest AI-writing tell) from all app copy -
  six hand-written prose rewrites (borrow/earn intros, card bodies, pool/market
  descriptions, health warnings, metadata titles), then a blanket `U+2014 -> "-"`
  sweep across `*.ts`/`*.tsx`, verifying "0 remain" by grepping and printing hits
  through PowerShell.
- **Cause:** three stacked hazards in one chore. (1) The Windows console cannot
  render U+2014, so both hits and clean verification lines print mojibake - you
  cannot trust your eyes on either outcome. (2) Inline one-liners passed through
  the bash wrapper lose their `$` sigils (`powershell -Command "foreach($x...)"`,
  `node -e "var x..."`), so a verification loop died with "Missing variable
  name after foreach" for no visible reason. (3) The Edit tool, restructuring a
  copy block, inserted a newline inside a quoted JS string literal
  (MarketActionCard.tsx) - unterminated string, hard build failure.
- **Detection:** write every sweep/verify step to a temp `.ps1` file, address the
  character as `[char]0x2014` (never a literal), and confirm with byte-level
  `[IO.File]::ReadAllText(...).Contains(...)` counts plus the Read tool for spot
  checks (the Read tool decodes UTF-8 properly; the console does not). Scope the
  replace to em dashes ONLY: en dashes in numeric ranges ("1.30-1.50",
  "0.01-50%") are correct typography, not slop.
- **Fix:** 6 targeted prose rewrites + 7 file sweeps (34 TS/TSX files, then
  docs/*.md, README, BUILD_PLAN, AGENTS, scripts/*.mjs, .env comments). Final
  catch-all scan of every non-binary file outside node_modules/.next/.git:
  0 em dashes (only regenerated *.log files still hold them). lint + tsc + build
  stayed green; a 9-page Playwright pass confirmed 0 em dashes in rendered text.
- **Time lost:** ~25 min (one broken string-literal edit, two mangled inline
  one-liners, repeated false-alarm mojibake reads).
- **Would help:** a lint rule banning U+2014 in source strings (en dashes stay
  legal for ranges), and a terminal that renders the full Unicode range so
  verification output is trustworthy.


## 31. 100dvh on a page root overflows when the layout has fixed chrome - subtract the real offsets
- **Tried:** making /stocks an "app screen" (fixed card fills the viewport,
  only the card interior swipes):
  page root `h-dvh`, then a guessed inner `h-[calc(100dvh - 12rem)]`, then
  `h-dvh` again after restructuring to a flex column.
- **Cause:** the root layout wraps every page in `main` with `pt-14 lg:pt-16`
  (fixed header) and `pb-16 md:pb-0` (mobile bottom nav), plus a flow Footer
  below `main`. A page-level `100dvh` counts none of that, so the card ended
  40-160px below the fold (`docScrollHeight` 992-1060 vs `winHeight` 900)
  while every isolated check still "looked" right. The hard-coded 12rem guess
  was worse: it packed header + h1 block + padding + footer into one magic
  number that broke on the next layout tweak.
- **Detection:** assert geometry in Playwright instead of eyeballing:
  `card.getBoundingClientRect().bottom <= innerHeight + 1`,
  `window.scrollY === 0` while `scroller.scrollTop = 900`, and
  `th.getBoundingClientRect().top === scroller.getBoundingClientRect().top`
  (sticky header still pinned). Three numbers, catches every regression.
- **Fix:** page root height = `calc(100dvh - <main pt+pb>)` with responsive
  variants matching the layout (`7rem` mobile / `3.5rem` md / `4rem` lg),
  `overflow-hidden` on the root, `flex-1 min-h-0` on the card (magic numbers
  gone), `overscroll-contain` on the inner scroller so wheel/touch never
  chains to the page. The Footer stays reachable by normal page scroll below
  the fold; the card itself always fits.
- **Time lost:** ~20 min (two rebuild cycles chasing docScrollHeight).
- **Would help:** a shared `AppScreen` wrapper (or layout-owned CSS vars
  `--chrome-top` / `--chrome-bottom`) so future app-style pages size
  themselves in one place; and the geometry assertions above as a standing
  QA check.
- **Update:** the viewport-fill fix above was later reverted, not for a bug but
  for a product decision - the spec wanted choice parity (first view = exactly
  5 rows desktop / 10 rows mobile, not "fill whatever height is left"). Final
  design: page returns to normal flow (no `100dvh` anywhere), rows get fixed
  heights (`h-11 md:h-16`, padding moved off the cells), the header row is
  `h-10`, and the scroller is capped at `max-h-[480px] md:max-h-[360px]`
  (= 40 + 10x44 / 40 + 5x64). Row counts are then deterministic integers - no
  dvh math, no chrome offsets, and the count assertion (`rows fully visible at
  scrollTop 0 == 10 / 5`) is exact. The lesson stands for any future page that
  genuinely wants a viewport-filling app screen.