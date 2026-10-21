import type { Metadata } from "next";
import { Fragment } from "react";
import { Bullets, L, LegalShell, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Nexa",
  description:
    "What Nexa does and does not collect: no accounts, no trackers, wallet and operational data only.",
};

const TOC: readonly (readonly [string, string])[] = [
  ["not-collected", "Information we do not collect"],
  ["wallet-data", "Wallet and blockchain data"],
  ["processed", "Information processed to run the application"],
  ["storage", "Storage on your device"],
  ["cookies", "Cookies"],
  ["third-parties", "Third-party services"],
  ["retention", "Data retention"],
  ["children", "Children"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact"],
];

export default function PrivacyPage() {
  return (
    <LegalShell
      page="privacy"
      label="Privacy"
      title="Privacy Policy"
      updated="October 17, 2026"
      toc={TOC}
      next={{ href: "/terms", label: "Terms & Conditions" }}
      intro={
        <>
          Nexa is a <strong className="font-medium text-fg">self-custodial</strong> application. You
          do not create an account, and we do not ask for your name, email address, or identity
          documents. This page explains the limited information that is processed to run the
          application, where it goes, and what stays on your own device. The short version: the
          site has <em>no analytics, no advertising trackers, and no tracking cookies</em>.
        </>
      }
    >
      <Section id="not-collected" title="Information we do not collect">
        <p>Nexa has no sign-up, so we never receive:</p>
        <Bullets
          items={[
            "Your name, email address, phone number, or government identification",
            "Your wallet's secret phrase or private keys (never enter them into any website)",
            "Cross-site tracking or advertising data (the site runs no analytics or tracking scripts)",
            "Payment details (the application currently charges no fee of its own)",
          ]}
        />
      </Section>

      <Section id="wallet-data" title="Wallet and blockchain data">
        <p>
          When you connect a wallet, your wallet address becomes visible to the application. Your
          address and every transaction you sign are recorded{" "}
          <strong className="font-medium text-fg">publicly on BNB Smart Chain</strong>, where anyone
          can observe them. This is <em>inherent to public blockchains</em> and is not specific to
          Nexa. Addresses, token transfers, and balances may be viewed by anyone using an explorer
          such as <L href="https://bscscan.com">BscScan</L>.
        </p>
      </Section>

      <Section id="processed" title="Information processed to run the application">
        <p>To serve quotes and execute trades, the following is processed:</p>
        <Bullets
          items={[
            <Fragment key="i0">
              <strong className="font-medium text-fg">Quote and swap requests.</strong> When you
              request a quote or a swap, your wallet address, the token addresses, the amount, and
              the slippage setting are sent to the Binance Web3 Trading API, which routes
              liquidity and returns the quote or transaction data.
            </Fragment>,
            <Fragment key="i1">
              <strong className="font-medium text-fg">Market data requests.</strong> Prices,
              token lists, and market status are fetched from public Binance market data endpoints
              through the application&apos;s server. These requests contain no personal information.
            </Fragment>,
            <Fragment key="i2">
              <strong className="font-medium text-fg">Rate limiting.</strong> Your IP address is
              read from the request in memory to rate-limit API calls and protect the shared
              quota. It is not written to storage and is discarded when the process restarts.
            </Fragment>,
            <Fragment key="i3">
              <strong className="font-medium text-fg">Operational activity log.</strong> A rolling
              log of recent activity (wallet address, token, amount, timestamp, and whether the
              request succeeded) is kept on the server that runs Nexa. It powers the operator
              dashboard you would see in a support conversation, and old entries drop off
              automatically as the log grows past its size cap.
            </Fragment>,
            <Fragment key="i4">
              <strong className="font-medium text-fg">Hosting logs.</strong> The application is
              hosted on infrastructure such as Vercel, which processes request metadata
              (including IP addresses) according to its own privacy policy.
            </Fragment>,
          ]}
        />
      </Section>

      <Section id="storage" title="Storage on your device">
        <p>
          Nexa uses your browser&apos;s local storage to remember small things on your side only:
          which notifications you have read, and your swap history so you can review past trades
          from the activity panel. This data{" "}
          <strong className="font-medium text-fg">never leaves your browser</strong>. You can clear
          it at any time from your browser&apos;s site data settings, which also resets your read
          notifications.
        </p>
      </Section>

      <Section id="cookies" title="Cookies">
        <p>
          The Nexa application itself sets{" "}
          <strong className="font-medium text-fg">no cookies</strong>. The separate operator console
          sets a single session cookie after a password login so the operator stays signed in; it
          is not used to track visitors and is not part of the public site.
        </p>
      </Section>

      <Section id="third-parties" title="Third-party services">
        <p>Nexa depends on third parties that process data under their own policies:</p>
        <Bullets
          items={[
            <Fragment key="i0">
              <L href="https://web3.binance.com">Binance Web3 Trading API</L> for swap quotes and
              transaction routing, and Binance market data endpoints for prices and token lists.
            </Fragment>,
            <Fragment key="i1">
              Lending and yield protocols (such as Venus, Lista, and the Native pool) when you
              supply, borrow, or withdraw. You interact with these contracts directly from your
              wallet.
            </Fragment>,
            <Fragment key="i2">
              A public BNB Smart Chain RPC node for reading balances and contract state, and{" "}
              <L href="https://bscscan.com">BscScan</L> for explorer links.
            </Fragment>,
            <Fragment key="i3">
              Your wallet provider (for example Binance Wallet or another browser wallet), which
              handles signing under its own terms.
            </Fragment>,
          ]}
        />
      </Section>

      <Section id="retention" title="Data retention">
        <p>
          The operational activity log keeps only recent entries and trims itself automatically.
          Application settings and notification content stay on the server for as long as the
          deployment runs. Host-level request logs follow the hosting provider&apos;s retention
          policy.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          Nexa is not directed at children, and we do not knowingly collect information from
          anyone under 18. Do not use the application if you are under 18.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          If this policy changes, the updated version will appear on this page with a new date.
          Continued use of the application after a change means you accept the revised policy.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          Questions about privacy can be raised on{" "}
          <L href="https://t.me/zachhct">Telegram</L>.
        </p>
      </Section>
    </LegalShell>
  );
}
