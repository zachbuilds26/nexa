import Link from "next/link";
import { WBNB_BSC } from "@/lib/erc20";
import { TokenImage } from "@/components/ui/TokenImage";

const PILLARS: { title: string; body: string }[] = [
  {
    title: "Trade",
    body: "Buy and sell tokenized stocks with USDT around the clock. The closing bell does not apply on-chain.",
  },
  {
    title: "Stocks",
    body: "Browse every tokenized stock with live prices and search, then open any market in one tap.",
  },
  {
    title: "Earn",
    body: "Put idle stock capital to work across BNB DeFi: lending markets and on-chain liquidity pools, ranked by live APY.",
  },
  {
    title: "Borrow",
    body: "Deposit a stock as collateral and borrow USDT against it. You keep your position and its dividends.",
  },
];

function MarketPill() {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-dim">
      <TokenImage address={WBNB_BSC} symbol="BNB" size={16} />
      <span>Live on BNB Smart Chain</span>
    </div>
  );
}

const POWERED_BY = [
  { src: "/brands/binance.svg", name: "Binance" },
  { src: "/brands/bnbchain.svg", name: "BNB Smart Chain" },
  { src: "/brands/venus.png", name: "Venus" },
  { src: "/brands/lista.png", name: "Lista DAO" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-[1536px] px-4 lg:px-8">
      <section className="flex flex-col items-center gap-6 py-16 text-center lg:py-24">
        <MarketPill />
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-fg lg:text-6xl">
          Your tokenized stocks,
          <br />
          put to work.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-dim">
          Nexa brings tokenized stocks on BNB Smart Chain together in one
          self-custodial app: trade them around the clock, earn yield on idle
          shares, or borrow against your portfolio without ever selling.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/trade"
            className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-ink scanlines transition-colors hover:bg-accent-hover"
          >
            Start trading
          </Link>
          <Link
            href="/borrow"
            className="inline-flex h-11 items-center rounded-xl border border-line-strong bg-btn-grey px-6 text-sm font-semibold text-fg transition-colors hover:bg-fill-strong"
          >
            Borrow against stocks
          </Link>
        </div>
      </section>

      <section aria-labelledby="powered-by-title" className="py-14">
        <div className="mx-auto max-w-[90rem] text-center">
          <h2 id="powered-by-title" className="text-sm font-semibold text-dim">
            Powered by
          </h2>
          <ul className="mx-auto mt-8 flex max-w-fit list-none flex-wrap items-center justify-center gap-x-12 gap-y-8 px-4">
            {POWERED_BY.map((t) => (
              <li key={t.name} className="flex shrink-0 items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.src}
                  alt=""
                  className="h-12 w-12 object-contain"
                />
                <span className="whitespace-nowrap text-base font-semibold text-fg">
                  {t.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 border-t border-line py-10 md:grid-cols-2 md:gap-6">
        {PILLARS.map((p) => (
          <article
            key={p.title}
            className="flex flex-col gap-5 rounded-[24px] border border-line bg-surface-3 p-6 md:rounded-[32px] md:p-9"
          >
            <h2 className="text-2xl font-medium tracking-tight text-fg md:text-3xl">
              {p.title}
            </h2>
            <p className="text-lg leading-relaxed text-dim md:text-xl">
              {p.body}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
