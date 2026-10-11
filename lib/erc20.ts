export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955" as const;
export const USDC_BSC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as const;
export const WBNB_BSC = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as const;
export const USD1_BSC = "0x8d0d000Ee44948FC98c9B98A4FA4921476f08b0d" as const;
export const U_BSC = "0xce24439F2d9C6A2289F741120fe202248B666666" as const;

export type PayToken = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  /** Local logo path when no /tokens/{address}.png exists (svg from the protocol CDN). */
  logo?: string;
};

export const PAY_TOKENS: PayToken[] = [
  { address: USDT_BSC, symbol: "USDT", decimals: 18 },
  { address: USDC_BSC, symbol: "USDC", decimals: 18 },
  { address: U_BSC, symbol: "U", decimals: 18, logo: "/tokens/0xce24439f2d9c6a2289f741120fe202248b666666.svg" },
  { address: USD1_BSC, symbol: "USD1", decimals: 18, logo: "/tokens/0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d.svg" },
  { address: WBNB_BSC, symbol: "WBNB", decimals: 18 },
];
