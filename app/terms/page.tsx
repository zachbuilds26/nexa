import type { Metadata } from "next";
import { Fragment } from "react";
import { Bullets, L, LegalShell, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions | Nexa",
  description:
    "The terms of using Nexa: self-custodial software, financial risk disclosures, and third-party dependencies.",
};

const TOC: readonly (readonly [string, string])[] = [
  ["what-nexa-is", "What Nexa is"],
  ["not-advice", "Not financial advice"],
  ["risks", "Risks"],
  ["tokenized-stocks", "Tokenized stocks"],
  ["fees", "Fees and costs"],
  ["eligibility", "Eligibility"],
  ["third-parties", "Third-party services and wallets"],
  ["no-warranty", "No warranties"],
  ["liability", "Limitation of liability"],
  ["changes", "Changes"],
  ["contact", "Contact"],
];

export default function TermsPage() {
  return (
    <LegalShell
      page="terms"
      label="Terms"
      title="Terms & Conditions"
      updated="October 17, 2026"
      toc={TOC}
      prev={{ href: "/privacy", label: "Privacy Policy" }}
      next={{ href: "/docs", label: "How Nexa works" }}
      intro={
        <>
          These terms govern your use of the Nexa application. By connecting a wallet or using the
          application, you agree to them. If you do not agree, do not use the application. Nexa is{" "}
          <strong className="font-medium text-fg">
            software, not a bank, broker, or investment adviser
          </strong>
          , and it holds <em>none</em> of your assets.
        </>
      }
    >
      <Section id="what-nexa-is" title="1. What Nexa is">
        <p>
          Nexa is an open interface for swapping, supplying, and borrowing against tokenized stock
          tokens (<em>bStocks</em>) and stablecoins on BNB Smart Chain. You interact with
          third-party protocols and liquidity venues directly from your own wallet.{" "}
          <strong className="font-medium text-fg">
            Nexa does not create accounts, custody funds, hold private keys, or execute trades on
            your behalf.
          </strong>{" "}
          Every action requires your wallet&apos;s signature and is final once broadcast to the
          network.
        </p>
      </Section>

      <Section id="not-advice" title="2. Not financial advice">
        <p>
          Nothing in the application, its displays, or its documentation is investment advice, a
          recommendation, or a solicitation to buy or sell any asset. Prices, yields, and health
          figures are informational and may be delayed, estimated, or based on third-party
          reference data. <strong className="font-medium text-fg">You make your own decisions and
          bear your own outcomes.</strong>
        </p>
      </Section>

      <Section id="risks" title="3. Risks">
        <p>Using decentralized software and tokenized assets carries substantial risk, including:</p>
        <Bullets
          items={[
            <Fragment key="i0">
              <strong className="font-medium text-fg">Market risk:</strong> token prices can move
              sharply, including the full value of your position
            </Fragment>,
            <Fragment key="i1">
              <strong className="font-medium text-fg">Protocol risk:</strong> smart contracts may
              contain bugs, be exploited, or behave unexpectedly
            </Fragment>,
            <Fragment key="i2">
              <strong className="font-medium text-fg">Liquidity risk:</strong> quotes can widen or
              disappear, and exits may be slow when markets move
            </Fragment>,
            <Fragment key="i3">
              <strong className="font-medium text-fg">Reference price risk:</strong> bStocks track
              external reference prices that can diverge from on-chain prices, especially when the
              underlying market is closed
            </Fragment>,
            <Fragment key="i4">
              <strong className="font-medium text-fg">Liquidation risk:</strong> borrowing against
              collateral can lead to liquidation if your health factor falls to the threshold
            </Fragment>,
            <Fragment key="i5">
              <strong className="font-medium text-fg">Regulatory risk:</strong> the availability
              and legality of tokenized assets can change in your jurisdiction
            </Fragment>,
            <Fragment key="i6">
              <strong className="font-medium text-fg">Dependency risk:</strong> quotes and swaps
              rely on third-party APIs and RPC nodes that can be unavailable
            </Fragment>,
            <Fragment key="i7">
              <strong className="font-medium text-fg">Wallet risk:</strong> lost keys, lost
              devices, or signing malicious transactions are your responsibility
            </Fragment>,
          ]}
        />
      </Section>

      <Section id="tokenized-stocks" title="4. Tokenized stocks">
        <p>
          bStocks are tokens issued by third parties that reference the price of a listed company&apos;s
          stock.{" "}
          <strong className="font-medium text-fg">They are not shares of the company</strong>:
          unless the token&apos;s issuer documentation states otherwise, holding a bStock does not
          grant shareholder rights, voting power, or dividend claims. The reference market&apos;s
          trading hours affect the reference price, while the token itself can transfer{" "}
          <em>around the clock</em> on-chain. Issuer, custody, and redemption terms are set by third
          parties and are outside Nexa&apos;s control.
        </p>
      </Section>

      <Section id="fees" title="5. Fees and costs">
        <p>
          Nexa currently charges <strong className="font-medium text-fg">no fee</strong> for using
          the application. Network gas fees (paid in BNB) apply to every transaction you sign.
          Liquidity and protocol fees are embedded in the quotes you receive and are displayed in
          the application (for example the Service Fee line in the quote card, or the
          instant-withdrawal fee on eligible Earn pools) before you confirm. Third parties may
          change their fees at any time.
        </p>
      </Section>

      <Section id="eligibility" title="6. Eligibility">
        <p>
          You must be <strong className="font-medium text-fg">at least 18 years old</strong> and
          legally able to use this software where you live.
          You may not use Nexa if applicable law, sanctions, or embargoes prohibit it. You are
          responsible for determining whether using tokenized assets is lawful in your
          jurisdiction.
        </p>
      </Section>

      <Section id="third-parties" title="7. Third-party services and wallets">
        <p>
          The application depends on third parties: liquidity venues and aggregators (such as the
          Binance Web3 Trading API), lending and yield protocols (such as Venus, Lista, and the
          Native pool), public blockchain nodes, explorers, and your wallet provider. Nexa does not
          control them and is not responsible for their actions, outages, fees, or terms. Your
          relationship with your wallet provider is governed by that provider&apos;s agreement.
        </p>
      </Section>

      <Section id="no-warranty" title="8. No warranties">
        <p>
          The application is provided{" "}
          <em>&quot;as is&quot; and &quot;as available&quot;</em>, without warranties of any kind,
          express or implied, including warranties of merchantability, fitness for a particular
          purpose, and non-infringement. We do not warrant that the application will be
          uninterrupted, error-free, secure, or that prices and data will be accurate.
        </p>
      </Section>

      <Section id="liability" title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Nexa and its contributors will not be liable for
          any indirect, incidental, special, consequential, or punitive damages, or for any loss of
          profits, digital assets, or data, arising from your use of the application. Where
          liability cannot be excluded, it is limited to the amount you paid to use the
          application, which is <em>zero</em> while the application charges no fee.
        </p>
      </Section>

      <Section id="changes" title="10. Changes">
        <p>
          These terms may be updated, and the revised date will appear on this page. Continued use
          after an update constitutes acceptance of the new terms.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          Questions about these terms can be raised on{" "}
          <L href="https://t.me/zachhct">Telegram</L>.
        </p>
      </Section>
    </LegalShell>
  );
}
