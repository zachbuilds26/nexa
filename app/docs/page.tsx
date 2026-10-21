import type { Metadata } from "next";
import { Fragment } from "react";
import { Bullets, L, LegalShell, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Docs | Nexa",
  description:
    "How Nexa works: quotes, swaps, custody, tokenized stock pricing, earn and borrow venues, fees, and security.",
};

const TOC = [
  ["what-nexa-is", "What Nexa is"],
  ["getting-started", "Getting started"],
  ["trading", "How trading works"],
  ["stocks", "Tokenized stocks & pricing"],
  ["earn-borrow", "Earn & borrow"],
  ["fees", "Fees"],
  ["history", "Activity history"],
  ["security", "Security"],
  ["faq", "FAQ"],
] as const;

export default function DocsPage() {
  return (
    <LegalShell
      page="docs"
      label="Docs"
      title="How Nexa works"
      toc={TOC}
      prev={{ href: "/terms", label: "Terms & Conditions" }}
      intro={<>Everything that happens under the hood of the Nexa desk, in plain language.</>}
    >
      <Section id="what-nexa-is" title="What Nexa is">
        <p>
          Nexa is a self-custodial terminal for tokenized stocks on BNB Smart Chain. US stocks are
          represented on BSC as ERC-20 tokens (bStocks), priced around the clock even while the
          reference market is closed. Nexa puts three actions on top of them:{" "}
          <strong className="font-medium text-fg">Trade</strong> (swap bStocks against
          stablecoins), <strong className="font-medium text-fg">Earn</strong> (supply assets to
          lending and yield venues), and <strong className="font-medium text-fg">Borrow</strong>{" "}
          (post a bStock as collateral and borrow USDT).
        </p>
        <p>
          <strong className="font-medium text-fg">Nexa is an interface, not a custodian.</strong>{" "}
          Every action is a standard swap, approve, supply, or borrow signed by your own wallet,
          directly against existing protocol contracts. There are{" "}
          <em>no new contracts, no custody, no lockups, and no accounts</em>.
        </p>
      </Section>

      <Section id="getting-started" title="Getting started">
        <Bullets
          items={[
            <Fragment key="i0">
              <strong className="font-medium text-fg">No wallet needed to browse.</strong> The full
              bStock universe, live prices, and charts work before you connect anything.
            </Fragment>,
            <Fragment key="i1">
              <strong className="font-medium text-fg">Connect a wallet.</strong> Use Binance Wallet
              or any injected browser wallet. You stay on BNB Smart Chain (chain 56).
            </Fragment>,
            <Fragment key="i2">
              <strong className="font-medium text-fg">Keep some BNB for gas.</strong> Every
              transaction you sign pays gas in BNB.
            </Fragment>,
            <Fragment key="i3">
              <strong className="font-medium text-fg">Fund the trade.</strong> Swaps start from
              USDT, USDC, USD1, or U by default, and you can trade in the other direction by
              flipping the pair.
            </Fragment>,
          ]}
        />
        <p>
          Each action button explains why it is disabled (no wallet, wrong network, insufficient
          balance) until the condition is met.
        </p>
      </Section>

      <Section id="trading" title="How trading works">
        <p>The swap card runs a fixed sequence, and you sign only the final steps:</p>
        <Bullets
          items={[
            <Fragment key="i0">
              <strong className="font-medium text-fg">Quote.</strong> The card requests a route
              from the Binance Web3 aggregator. Quotes carry a 30-second lifetime with a visible
              countdown; expired quotes refresh automatically.
            </Fragment>,
            <Fragment key="i1">
              <strong className="font-medium text-fg">Approve (once per token).</strong> If your
              allowance for the router is too low, your wallet asks for an ERC-20 approval first.
              This is a standard one-time permission per token.
            </Fragment>,
            <Fragment key="i2">
              <strong className="font-medium text-fg">Sign.</strong> Your wallet signs the swap
              transaction. The funds move from your wallet through the routing contracts and back
              to your wallet. Nexa never sees a key or holds funds at any point.
            </Fragment>,
          ]}
        />
        <p>
          Settings in the swap card control slippage (auto slippage sizes itself from the quote&apos;s
          price impact) and an expert mode that skips the confirmation step for people who know
          what they are doing. Quotes show the Service Fee line returned by the venue, price
          impact, and the minimum you will receive.
        </p>
      </Section>

      <Section id="stocks" title="Tokenized stocks & pricing">
        <Bullets
          items={[
            <Fragment key="i0">
              <strong className="font-medium text-fg">Reference pricing.</strong> bStock prices
              follow Binance spot reference prices for the underlying ticker, so the app shows a
              live price and a market open/closed status even when the NASDAQ session is closed.
            </Fragment>,
            <Fragment key="i1">
              <strong className="font-medium text-fg">24/7 transfers.</strong> The token trades
              around the clock on-chain; the underlying reference market is not always open, which
              is exactly why prices can move differently from the listed stock.
            </Fragment>,
            <Fragment key="i2">
              <strong className="font-medium text-fg">Share multiplier.</strong> Some bStocks carry
              a shares-per-token multiplier (1 MUB = 1.000217 shares in the current universe). The
              stock page shows this, along with market cap, holders, and fundamentals where the
              data exists.
            </Fragment>,
            <Fragment key="i3">
              <strong className="font-medium text-fg">The universe loads live.</strong> The full
              token list comes from Binance&apos;s RWA API, so listing changes appear without a
              redeploy.
            </Fragment>,
          ]}
        />
      </Section>

      <Section id="earn-borrow" title="Earn & borrow">
        <p>
          <strong className="font-medium text-fg">Earn</strong> ranks supply venues by live APY:
          stables to Venus, bStocks to the Native pool, and other listed opportunities, each with
          its own balance, APR, and deposit flow. Eligible pools offer an instant withdrawal path
          with a protocol fee shown before you confirm.
        </p>
        <p>
          <strong className="font-medium text-fg">Borrow</strong> lets you post a supported bStock
          as collateral in a lending market and borrow USDT without selling it. The market page
          shows your collateral, debt, and health factor live. If the health factor falls toward
          the liquidation threshold, add collateral or repay; if it stays healthy, withdraw
          collateral freely.
        </p>
      </Section>

      <Section id="fees" title="Fees">
        <Bullets
          items={[
            "Nexa itself charges no fee for using the application.",
            "Network gas is paid in BNB to the network on every transaction you sign.",
            "Liquidity and protocol fees are embedded in quotes and shown in the UI before you sign, including the Service Fee line and any instant-withdrawal fee.",
            "Third parties (venues, protocols, networks) can change their own fees at any time.",
          ]}
        />
      </Section>

      <Section id="history" title="Activity history">
        <p>
          The clock icon inside the swap card opens your swap history: pair, amounts, time, and a
          BscScan link per settled trade. History is stored in your browser&apos;s local storage only,
          on the device you traded from. It is never uploaded anywhere. Clearing your site data
          clears the history.
        </p>
      </Section>

      <Section id="security" title="Security">
        <Bullets
          items={[
            "Nexa never asks for a seed phrase or private key. No form on the site will ever request one.",
            "You hold the keys: transactions are signed by your wallet, and you can verify every recipient and amount in your wallet prompt before approving.",
            "There are no custom contracts in the trade path, only existing tokens, routers, and lending protocols.",
            "Reads go through the app's server proxies (market data) and a public BSC RPC node; writes go straight from your wallet to the contracts.",
            "Always check the domain you are on, and treat any request for your seed phrase as hostile.",
          ]}
        />
      </Section>

      <Section id="faq" title="FAQ">
        <div className="space-y-4">
          <div>
            <p className="font-medium text-fg">Do I need an account?</p>
            <p className="mt-1">No. There is no sign-up, no email, and no KYC on Nexa.</p>
          </div>
          <div>
            <p className="font-medium text-fg">Does Nexa ever hold my funds?</p>
            <p className="mt-1">
              No. Funds move from your wallet to protocol contracts and back. The application never
              holds keys or balances.
            </p>
          </div>
          <div>
            <p className="font-medium text-fg">Why is a quote or swap unavailable right now?</p>
            <p className="mt-1">
              Quotes and swaps depend on the Binance Web3 aggregator. If it is unreachable or the
              route has no liquidity, the card says so and retries. Your funds are unaffected
              either way, because they stay in your wallet or the protocols you already used.
            </p>
          </div>
          <div>
            <p className="font-medium text-fg">Where do I see what I traded before?</p>
            <p className="mt-1">
              The clock icon in the swap card. See <L href="#history">Activity history</L>.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Links">
        <p className="space-x-4">
          <L href="https://t.me/zachhct">Telegram</L>
          <L href="https://bscscan.com">BscScan</L>
          <L href="https://web3.binance.com">Binance Web3 Trading API</L>
        </p>
      </Section>
    </LegalShell>
  );
}
