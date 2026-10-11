import { createPublicClient, http, parseAbi } from "viem";
import { bsc } from "viem/chains";
import { writeFileSync } from "node:fs";

const RPC = process.env.BSC_RPC ?? "https://bsc.publicnode.com";
const COMPTROLLER = "0xfD36E2c2a6789Db23113685031d7F16329158384";
const UNIVERSE_URL = process.env.UNIVERSE_URL ?? "http://localhost:3001/api/rwa/universe";
const DEAD = "0x000000000000000000000000000000000000dEaD";

const comptrollerAbi = parseAbi([
  "function getAllMarkets() view returns (address[])",
  "function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa)",
  "function oracle() view returns (address)",
  "function mintAllowed(address vToken, address borrower, uint256 mintAmount) view returns (uint256)",
]);
const vTokenAbi = parseAbi([
  "function underlying() view returns (address)",
  "function symbol() view returns (string)",
]);
const erc20Abi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);
const oracleAbi = parseAbi([
  "function getUnderlyingPrice(address vToken) view returns (uint256)",
]);

const client = createPublicClient({ chain: bsc, transport: http(RPC) });

const universeRes = await fetch(UNIVERSE_URL);
const universeJson = await universeRes.json();
if (!universeJson.ok) throw new Error("universe fetch failed - is the dev server running?");
const universe = universeJson.data;
const byAddress = new Map(universe.map((s) => [s.contractAddress.toLowerCase(), s]));

const block = await client.getBlockNumber();
const markets = await client.readContract({
  address: COMPTROLLER,
  abi: comptrollerAbi,
  functionName: "getAllMarkets",
});
const oracle = await client.readContract({
  address: COMPTROLLER,
  abi: comptrollerAbi,
  functionName: "oracle",
});

console.log(`block=${block}  comptroller=${COMPTROLLER}  oracle=${oracle}`);
console.log(`markets=${markets.length}  universe=${universe.length}`);

const listedCf = await client.multicall({
  contracts: markets.map((v) => ({
    address: COMPTROLLER,
    abi: comptrollerAbi,
    functionName: "markets",
    args: [v],
  })),
  allowFailure: true,
});

const symbols = await client.multicall({
  contracts: markets.map((v) => ({
    address: v,
    abi: vTokenAbi,
    functionName: "symbol",
  })),
  allowFailure: true,
});

const underlyings = await client.multicall({
  contracts: markets.map((v) => ({
    address: v,
    abi: vTokenAbi,
    functionName: "underlying",
  })),
  allowFailure: true,
});

const underlyingAddrs = underlyings.map((r) =>
  r.status === "success" ? String(r.result).toLowerCase() : null,
);
const uniqueUnderlyings = [...new Set(underlyingAddrs.filter(Boolean))];

const ulMeta = await client.multicall({
  contracts: uniqueUnderlyings.flatMap((a) => [
    { address: a, abi: erc20Abi, functionName: "symbol" },
    { address: a, abi: erc20Abi, functionName: "decimals" },
  ]),
  allowFailure: true,
});
const metaByAddr = new Map();
uniqueUnderlyings.forEach((a, i) => {
  const sym = ulMeta[i * 2];
  const dec = ulMeta[i * 2 + 1];
  metaByAddr.set(a, {
    symbol: sym.status === "success" ? sym.result : "?",
    decimals: dec.status === "success" ? Number(dec.result) : 18,
  });
});

const prices = await client.multicall({
  contracts: markets.map((v) => ({
    address: oracle,
    abi: oracleAbi,
    functionName: "getUnderlyingPrice",
    args: [v],
  })),
  allowFailure: true,
});

const mint = await client.multicall({
  contracts: markets.map((v) => ({
    address: COMPTROLLER,
    abi: comptrollerAbi,
    functionName: "mintAllowed",
    args: [v, DEAD, 0n],
  })),
  allowFailure: true,
});

const rows = markets.map((v, i) => {
  const lc = listedCf[i];
  const isListed = lc.status === "success" ? lc.result[0] : false;
  const cf =
    lc.status === "success" ? Number(lc.result[1]) / 1e18 : null;
  const vSymbol = symbols[i].status === "success" ? symbols[i].result : "?";
  const ulAddr = underlyingAddrs[i];
  const meta = ulAddr ? metaByAddr.get(ulAddr) : null;
  const stock = ulAddr ? byAddress.get(ulAddr) : undefined;
  const priceRaw = prices[i].status === "success" ? prices[i].result : null;
  const decimals = meta?.decimals ?? 18;
  const priceUsd =
    priceRaw !== null ? Number(priceRaw) / 10 ** (36 - decimals) : null;
  const mintOk =
    mint[i].status === "success" ? Number(mint[i].result) === 0 : null;
  return {
    vToken: v,
    vSymbol,
    ulAddr,
    ulSymbol: meta?.symbol ?? (ulAddr === null ? "BNB (native)" : "?"),
    isListed,
    cf,
    priceUsd,
    priceRaw,
    mintOk,
    stock,
  };
});

const eligible = rows.filter((r) => r.stock);
const others = rows.filter((r) => !r.stock);

const fmt = (n, d = 2) => (n === null || n === undefined ? "-" : n.toFixed(d));
const lines = [];
lines.push("# Venus Core Pool - on-chain enumeration");
lines.push("");
lines.push(`- Generated: ${new Date().toISOString()}`);
lines.push(`- Block: ${block}`);
lines.push(`- RPC: ${RPC}`);
lines.push(`- Comptroller (Unitroller): \`${COMPTROLLER}\``);
lines.push(`- Oracle: \`${oracle}\``);
lines.push(`- Total markets: **${rows.length}**`);
lines.push(
  `- Eligible bStock markets (underlying ∈ 87-token universe): **${eligible.length}**`,
);
lines.push(`- Listed: ${rows.filter((r) => r.isListed).length} / ${rows.length}`);
lines.push(
  `- mintAllowed = NO_ERROR: ${rows.filter((r) => r.mintOk).length} / ${rows.length}`,
);
lines.push("");
lines.push("## Eligible bStock markets (from chain)");
lines.push("");
lines.push("| vToken | vSymbol | bStock | underlying | listed | CF | oracle USD | mintAllowed |");
lines.push("|---|---|---|---|---|---|---|---|");
for (const r of eligible.sort((a, b) => a.stock.ticker.localeCompare(b.stock.ticker))) {
  lines.push(
    `| \`${r.vToken}\` | ${r.vSymbol} | ${r.stock.ticker} | \`${r.ulAddr}\` | ${r.isListed} | ${fmt(r.cf, 4)} | ${fmt(r.priceUsd, 4)} | ${r.mintOk} |`,
  );
}
lines.push("");
lines.push("## Non-bStock markets (Core Pool)");
lines.push("");
lines.push("| vToken | vSymbol | underlying | symbol | listed | CF | oracle USD |");
lines.push("|---|---|---|---|---|---|---|");
for (const r of others) {
  lines.push(
    `| \`${r.vToken}\` | ${r.vSymbol} | ${r.ulAddr ? `\`${r.ulAddr}\`` : "-"} | ${r.ulSymbol} | ${r.isListed} | ${fmt(r.cf, 4)} | ${fmt(r.priceUsd, 4)} |`,
  );
}
lines.push("");
lines.push("## Universe bStocks NOT listed on Venus Core Pool");
lines.push("");
const eligibleSet = new Set(eligible.map((r) => r.ulAddr));
const missing = universe.filter(
  (s) => !eligibleSet.has(s.contractAddress.toLowerCase()),
);
lines.push(
  missing.length
    ? missing.map((s) => `- ${s.ticker} \`${s.contractAddress}\``).join("\n")
    : "(none - all 87 listed)",
);
lines.push("");

writeFileSync("docs/venus-enumeration.md", lines.join("\n"));

console.log(`\nEligible bStock markets: ${eligible.length}/${universe.length}`);
for (const r of eligible) {
  console.log(
    `  ${r.stock.ticker.padEnd(7)} cf=${fmt(r.cf, 4)} price=$${fmt(r.priceUsd, 4)} mint=${r.mintOk} ${r.vToken}`,
  );
}
console.log(`\nOthers: ${others.length}`);
for (const r of others) {
  console.log(
    `  ${r.vSymbol.padEnd(10)} ${r.ulSymbol.padEnd(14)} cf=${fmt(r.cf, 4)} price=$${fmt(r.priceUsd, 4)} mint=${r.mintOk}`,
  );
}
console.log(`\nMissing from universe: ${missing.map((s) => s.ticker).join(", ") || "none"}`);
console.log("\nwrote docs/venus-enumeration.md");
