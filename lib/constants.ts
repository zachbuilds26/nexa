/**
 * Shared fallback constants. Kept in one place so the read-only quote wallet
 * and the QQQB earn fallback can't drift apart between hooks.
 */

/**
 * Quotes are wallet-agnostic - verified against the Binance aggregator.
 * A read-only placeholder wallet lets anyone see live prices pre-connect.
 */
export const READ_WALLET = "0x0000000000000000000000000000000000000000" as const;

/** Fallback QQQB token address; the universe listing is preferred when it loads. */
export const QQQB_FALLBACK = "0x205812CdBed920aFf76C6580abD681a46D11efc7" as const;
