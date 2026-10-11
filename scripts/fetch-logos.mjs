// Downloads token/stock logos into public/tokens/<lowercase-address>.png
// Source: public Binance bapi meta/info (icon path), CDN host bin.bnbstatic.com
// Run: node scripts/fetch-logos.mjs
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "tokens");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const PAY_TOKENS = [
  "0x55d398326f99059fF775485246999027B3197955", // USDT
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
];

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Encoding": "identity" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function fetchUniverse() {
  const j = await getJson(
    "https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=3",
  );
  const list = Array.isArray(j.data) ? j.data : j.data?.list ?? [];
  return list.map((t) => t.contractAddress).filter(Boolean);
}

async function fetchIcon(contractAddress) {
  const j = await getJson(
    `https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info?chainId=56&contractAddress=${contractAddress}`,
  );
  return j.data?.icon ?? null;
}

async function downloadOne(contractAddress) {
  const key = contractAddress.toLowerCase();
  const dest = path.join(OUT, `${key}.png`);
  if (!process.argv.includes("--force")) {
    try {
      await access(dest);
      return { key, status: "exists" };
    } catch {
      /* missing - download below */
    }
  }
  try {
    const icon = await fetchIcon(contractAddress);
    if (!icon) return { key, status: "no-icon" };
    const r = await fetch(`https://bin.bnbstatic.com${icon}`, { headers: { "User-Agent": UA } });
    if (!r.ok) return { key, status: `cdn-${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50;
    if (!isPng) return { key, status: "not-png" };
    await writeFile(dest, buf);
    return { key, status: "ok" };
  } catch (e) {
    return { key, status: `err:${e.message}` };
  }
}

async function pool(items, worker, width = 6) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    }),
  );
  return results;
}

const universe = await fetchUniverse();
const addresses = [...new Set([...universe, ...PAY_TOKENS])];
console.log(`fetching logos for ${addresses.length} tokens (${universe.length} bStocks + ${PAY_TOKENS.length} pay tokens)`);

await mkdir(OUT, { recursive: true });
const results = await pool(addresses, downloadOne);
const ok = results.filter((r) => r.status === "ok" || r.status === "exists").length;
const bad = results.filter((r) => r.status !== "ok" && r.status !== "exists");
console.log(`done: ${ok}/${results.length} present in public/tokens/`);
if (bad.length) console.log("failed:", bad.map((b) => `${b.key.slice(0, 10)}… ${b.status}`).join(", "));
