import { createPublicClient, http, parseAbi, zeroAddress } from "viem";
import { bsc } from "viem/chains";

const RPC = process.env.BSC_RPC ?? "https://bsc.publicnode.com";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const VUSDT = "0xfD5840Cd36d94D7229439859C0112a4185BC0255";
const V2_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const V3_FACTORY = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";

const client = createPublicClient({ chain: bsc, transport: http(RPC) });

const vAbi = parseAbi([
  "function supplyRatePerBlock() view returns (uint256)",
  "function reserveFactorMantissa() view returns (uint256)",
  "function borrowRatePerBlock() view returns (uint256)",
  "function getCash() view returns (uint256)",
  "function totalBorrows() view returns (uint256)",
  "function totalReserves() view returns (uint256)",
]);
const v2Abi = parseAbi(["function getPair(address, address) view returns (address)"]);
const v3Abi = parseAbi(["function getPool(address, address, uint24) view returns (address)"]);

console.log("== vUSDT supply-side params ==");
for (const fn of ["supplyRatePerBlock", "reserveFactorMantissa", "borrowRatePerBlock", "getCash", "totalBorrows", "totalReserves"]) {
  try {
    const r = await client.readContract({ address: VUSDT, abi: vAbi, functionName: fn });
    console.log(` ${fn} = ${r} (${fn.includes("Rate") ? (Number(r) / 1e18).toExponential(3) + "/block" : ""})`);
  } catch (e) {
    console.log(` ${fn} = REVERT (${String(e).slice(0, 80)})`);
  }
}

const universeRes = await fetch("http://localhost:3001/api/rwa/universe");
const universe = (await universeRes.json()).data;
const bstocks = universe.slice(0, 20).map((s) => ({ symbol: s.symbol, addr: s.contractAddress }));
console.log(`\n== Pancake pairs (first ${bstocks.length} of ${universe.length} bStocks) vs USDT ==`);

let v2Hits = 0;
let v3Hits = 0;
for (const s of bstocks) {
  try {
    const pair = await client.readContract({ address: V2_FACTORY, abi: v2Abi, functionName: "getPair", args: [s.addr, USDT] });
    const pool500 = await client.readContract({ address: V3_FACTORY, abi: v3Abi, functionName: "getPool", args: [s.addr, USDT, 500] });
    const pool3000 = await client.readContract({ address: V3_FACTORY, abi: v3Abi, functionName: "getPool", args: [s.addr, USDT, 3000] });
    const hasV2 = pair.toLowerCase() !== zeroAddress;
    const hasV3 = pool500.toLowerCase() !== zeroAddress || pool3000.toLowerCase() !== zeroAddress;
    if (hasV2) v2Hits++;
    if (hasV3) v3Hits++;
    if (hasV2 || hasV3) console.log(` ${s.symbol}: v2=${hasV2 ? pair : "-"} v3_500=${pool500.toLowerCase() !== zeroAddress ? pool500 : "-"} v3_3k=${pool3000.toLowerCase() !== zeroAddress ? pool3000 : "-"}`);
  } catch (e) {
    console.log(` ${s.symbol}: ERROR ${String(e).slice(0, 100)}`);
  }
}
console.log(`v2 pairs found: ${v2Hits}/${bstocks.length}  v3 pools found: ${v3Hits}/${bstocks.length}`);
