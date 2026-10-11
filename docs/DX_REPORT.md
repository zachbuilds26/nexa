# Nexa - Developer Experience Report

**BNB Hack: Tokenized Stocks Edition · October 2026**

---

## What we built

Nexa is a DeFi app for tokenized US stocks on BNB Smart Chain. You can swap them, deposit them as collateral to borrow against, and earn yield on idle capital. No custom smart contracts, no custody — every transaction is signed by the user's own wallet.

The app talks to three protocols: PancakeSwap for swaps, Venus for lending, and Native for yield. Market data comes from Binance's public RWA API.

---

## The architecture, briefly

**Data plane.** Binance's RWA API has no CORS headers and rate-limits to ~1 request per second per IP. Every read goes through small Next.js route handlers (`/api/rwa/*`) that cache responses for 15 seconds (quotes) to 1 hour (universe list) and serve stale data while refreshing in the background. The spread ticker needs HMAC-signed credentials, so it runs through a separate proxy that keeps keys on the server.

**Chain plane.** A viem public client reads Venus markets, oracle prices, and user positions via multicalls. Writes go through wagmi v3 with a custom `window.binance` connector for Binance Web3 Wallet. Swaps quote from PancakeSwap's Unified Swap API, which returns ready-to-sign calldata in one call.

**App plane.** Next 16 with `cacheComponents`: static shells for every route, data streamed inside `<Suspense>` boundaries. TanStack Query owns client state. Every async surface has explicit loading, empty, error, and disabled states with working retries. The transaction UI derives entirely from React Query's mutation state — no `phase` variable, no effects watching receipts.

---

## The friction that shaped the build

We logged every dead-end in a file called FRICTION.md. This is the shortlist of the ones that actually changed how we built things.

---

### 1. PancakeSwap's on-chain quoter is broken

**What happened:** We tried to quote swaps by calling PancakeSwap's QuoterV2 contract directly via `eth_call`. Every call returned `execution reverted: 0x` — even for the most liquid pair on the chain (USDT/WBNB). We tried three different RPC nodes. All failed identically.

The problem: viem reports the same error for "function doesn't exist" and "real revert with no data." We couldn't tell if we had the wrong contract address, wrong function signature, or if the contract was genuinely reverting.

**What we did:** Abandoned on-chain quoting entirely. Switched to PancakeSwap's Unified Swap API — a public HTTP endpoint that returns a quote, price impact, and ready-to-sign calldata in one call. No key needed.

**Lesson:** When the on-chain path is broken, check if the protocol has an HTTP API first. It's usually faster and more reliable.

---

### 2. Binance Web3 API has great auth docs and zero param docs

**What happened:** The HMAC signing sample in Binance's docs worked on the first try. But the quote and swap endpoints? The docs list the URL and show example requests — but the actual query parameters (`binanceChainId`, `fromTokenAddress`, `slippagePercent`, etc.) appear nowhere. The docs are a JavaScript SPA that doesn't render for crawlers, and `llms.txt` is empty.

**What we did:** Let the error messages teach us. We made six requests, and each `40001 Parameter [x] is required` response revealed one more parameter. The error messages were excellent — they told us exactly what was missing. The docs were the problem.

**Lesson:** When an API has good error messages but bad docs, just probe it. Send a request, read the error, add the parameter, repeat. It's faster than hunting for documentation that doesn't exist.

---

### 3. React Compiler killed our first transaction UI

**What happened:** Next 16's scaffold enables React Compiler lint rules. These rules ban `setState` inside `useEffect` and `Date.now()` in render — both hard errors, not warnings. Our first transaction UI used the classic wagmi pattern: a `phase` state variable, a `useEffect` watching the transaction receipt, and transitions between "approving," "idle," and "success." The lint rules made this unbuildable.

**What we did:** Rewrote the entire transaction UI using derived state. Instead of tracking a phase variable, we read directly from React Query's mutation state: `mutation.isPending`, `receipt.isLoading`, `receipt.isSuccess`. The UI renders from what the mutation *is*, not from what we think it should be. No effects, no state transitions, no phase variable.

**Lesson:** Under React Compiler rules, derive your UI from the data you have, not from state you manage yourself. It's cleaner, but it's a different way of thinking.

---

### 4. Next 16 `cacheComponents` turns dev warnings into build-stoppers

**What happened:** For weeks, our dev server showed console warnings about "unstable values" and "uncached data during prerendering." We ignored them — the app worked fine. Then we ran `next build` for the first time, and it failed. Hard. Three different ways, in three iterations:

1. Client pages calling `use(searchParams)` outside a `<Suspense>` boundary
2. A server page awaiting live fetches at render time
3. Layout chrome calling `usePathname()` — this one blocked *every* remaining route because the layout wraps all of them

The stack trace pointed at `providers.tsx:8` (the Suspense boundary), not the actual offender. The real problem was two or three frames deeper.

**What we did:** Wrapped every dynamic read in `<Suspense>` boundaries. Client pages got a thin default export that wraps the real component in a boundary. Layout chrome got geometry-preserving skeleton fallbacks so the static shell keeps its header and nav bars. The server page got `export const instant = false`.

**Lesson:** Run `next build` the day you write the route, not the day before submission. The errors only surface at build time, and the stack traces blame boundaries, not offenders.

---

### 5. Venus's exchange rate divisor is 1e18, not what you'd expect

**What happened:** Venus is a Compound fork, but its `exchangeRate` uses a fixed 1e18 divisor — not the decimal-adjusted variant (1e(10+decimals)) that most explorer samples and code examples show. For 18-decimal underlyings, that variant is off by 1e10. TVL would read $0. Health factor would report ~0 collateral.

**How we caught it:** Before trusting the math, we asserted the protocol's own accounting identity: `totalSupply × rate / 1e18 == cash + borrows − reserves`. It matched to 1 wei on vTSLAB in one call. If it hadn't matched, we would have known something was wrong before it poisoned every number in the app.

**Lesson:** Never trust a formula you found in a code sample. Assert the protocol's own invariants first. If the identity holds, the formula is right.

---

### 6. Venus has no `blocksPerYear`, and its bStock markets are dormant

**What happened:** To show borrow APR, we needed to scale the per-block rate to an annual figure. But Venus's Comptroller is a diamond proxy — `blocksPerYear()` reverts. Old docs say 10,512,000 blocks/year, but that's 6× off from BSC's real cadence. We measured it live: 2000 blocks in 900 seconds = 70.08M blocks/year. We cache that measurement for 10 minutes and show "-" on failure — never a guessed number.

Then the honest catch: all four bStock markets have `totalBorrows = 0`. Nobody borrows stocks. So utilization and borrow APR would render as 0.00% everywhere — technically true, but it makes the page look dead.

**What we did:** Swapped the context strip to metrics that carry information: market size (total supplied), the USDT APR (the cost of the debt you actually take), and your supply position.

**Lesson:** When the protocol's data is honest but useless, find the data that isn't.

---

### 7. Native's API sends no CORS headers, and a fallback masked the failure

**What happened:** The Earn page calls Native's Core API for vault discovery, activation fees, and account status. The browser blocked all three calls — no CORS headers. But `fetchNativeVault` had a catch that fell back to a documented constant, so the page "worked." The bug would have surfaced days later as a permanent "Vault unverified" gate on deposits.

**What we did:** Created a server-side proxy (`POST /api/native`) that forwards the exact body upstream, picks the endpoint by the `type` field, and passes the response through unchanged.

**Lesson:** Log every fallback hit like it's an error. To the user, a fallback that always fires *is* an error.

---

### 8. Tailwind's compiler eats plain CSS rules named after utility classes

**What happened:** We needed large text sizes to use a different font. The obvious approach: `.text-2xl, .text-3xl, .text-4xl { font-family: Montserrat }`. The source was correct, HMR reported success, lint passed — but the rule never appeared in the served CSS. Tailwind's compiler silently dropped it because the selector collided with utility names.

**What we did:** Used the attribute-selector form: `[class~="text-2xl"]`. This passes through Tailwind's pipeline untouched.

**Lesson:** Never write a plain CSS rule whose selector is a Tailwind utility name. After any non-obvious CSS, grep the stylesheet the browser actually received — a clean compile means nothing.

---

### 9. Display functions and parse functions are not the same thing

**What happened:** Our `formatUnits` returns locale-formatted strings (`696,290.08`) because it's for display. Someone used `Number(formatUnits(x))` to parse it back for math. `Number("696,290.08")` is NaN. Native USDC's $696K TVL rendered as $0, while QQQB ($21.6K, no separators) rendered correctly. The bug only bites amounts ≥ 1,000 — which is most real TVLs.

**What we did:** Added a separate `unitsToNumber()` function for math. Display functions never double as parsers.

**Lesson:** Split display and parse functions from day one. Give them different names. Never let one function do both jobs.

---

### 10. A cache that re-fetches on expiry blocks SSR under rate limits

**What happened:** Lighthouse scores swung between runs — LCP 2.0s vs 3.2s, with nothing in the app changing. The cause: our cache treated an expired TTL entry as a miss, so the SSR request awaited a live Binance API call. When Lighthouse sampled exactly at the TTL boundary, that fetch took seconds because of the 1/s rate limit.

**What we did:** Switched to stale-while-revalidate with in-flight dedupe. Fresh entries return instantly. Expired entries serve the stale value immediately and refresh in the background. Failed refreshes keep the stale value. Only the very first fetch ever blocks.

**Lesson:** For any rate-limited upstream, serve stale and refresh in the background. Read-through-on-expiry is the worst pattern for server-rendered pages.

---

### 11. Double-encoded UTF-8 shipped in 21 UI strings

**What happened:** A final non-ASCII byte scan matched a mangled comment in SwapCard.tsx. Investigation revealed 21 double-encoded characters in live UI strings — "Connecting…", "Quote expired — refresh", even the ✓ success icon. The cause: an earlier PowerShell write re-encoded the file with ANSI codepage. The corrupted labels only rendered in connected quote states, and every QA pass ran disconnected, so nobody saw them.

**How we caught it:** Searched decoded source for the lead characters U+00E2 and U+00C3. The codebase has no legitimate French accents, so any hit is corruption. An 82-file scan pinpointed the one infected file.

**What we did:** Rebuilt every replacement from explicit character codes and wrote with UTF-8 no-BOM. Rebuilt, restarted, then verified across 8 routes: zero corrupted characters rendered, zero console errors.

**Lesson:** After any file write through PowerShell, grep for U+00E2/U+00C3 in source. No legitimate accents exist in this codebase — any hit is mojibake.

---

### 12. Screenshots can lie to you

**What happened:** After removing some UI elements, three Playwright captures kept showing the wrong page while in-page `evaluate()` checks reported the correct DOM. Two files that were byte-identical on disk displayed as different images. The image-read path was replaying stale content.

**The fix:** After any screenshot, verify a per-run token visible inside the pixels (timestamp, page name). Cross-check PNG file hashes when two captures claim to be the same state. Trust only `evaluate()` output and byte hashes — never claim visual confirmation you didn't literally see with a matching in-image stamp.

---

## What we'd tell Day-1 us

1. **Let undocumented APIs' error messages teach you.** `40001 Parameter [x] is required` beat every docs page we found.
2. **Read the package's own exports file before writing code.** wagmi's migration guide doesn't ship in the box.
3. **Never hardcode units.** BSC USDT is 18 decimals, Venus prices are 1e(36−d), its rate is 1e18.
4. **Search for the paved path before the protocol path.** The Unified Swap API was worth 90 minutes of QuoterV2 pain.
5. **Treat every silent fallback as a future outage.** Log fallback-hits loudly.
6. **Run `next build` the day you write the route.** `cacheComponents` failures surface only at build.
7. **Split display functions from parse functions** before writing the first formatter.
8. **Verify served output, not compile output.** Grep the CSS the browser actually received.
9. **Default to stale-while-revalidate for any rate-limited upstream** if you'll server-render it.
10. **Automate verification as `evaluate()` + hashes.** Eyes and screenshots lie under load.

---

## By the numbers

| | |
|---|---|
| Friction entries logged | 31 (~10.5 hours of dead-end time) |
| Biggest single time sink | 90 min (PancakeSwap QuoterV2) |
| Routes shipped | 21 (`next build` green) |
| Live bStock tokens | 91 |
| Protocols integrated | 3 (PancakeSwap, Venus, Native) — 0 custom contracts |
| Lighthouse (desktop) | 90 / 100 / 100 / 100 |
| Lighthouse (mobile) | 70 / 100 / 100 / 100 |
