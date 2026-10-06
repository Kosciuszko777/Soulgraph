/**
 * Fiat → sats exchange rate (Payment layer).
 *
 * Prices are configured in fiat (docs/ARCHITECTURE.md §10); the sats amount a
 * user actually pays is derived live from a CONFIGURABLE rate source, with a
 * cached fallback and a visible "rate as of" timestamp. The rate is advisory —
 * entitlement verification applies a tolerance (ENTITLEMENT_AMOUNT_TOLERANCE)
 * precisely because this number drifts.
 *
 * Pure TypeScript (uses fetch). No React imports.
 */

import type { Currency } from '@/config/catalog';

/** A fiat→BTC price snapshot. `btcPerUnit` is how many BTC one fiat unit buys. */
export interface RateSnapshot {
  currency: Currency;
  /** Fiat price of 1 BTC (e.g. 60000 means 1 BTC = 60000 EUR). */
  fiatPerBtc: number;
  /** Unix seconds when this rate was observed. */
  as_of: number;
  /** Where the rate came from (for display / debugging). */
  source: string;
}

/**
 * A configurable rate source. Each returns the fiat price of one BTC for a
 * currency. Add or reorder sources here; the resolver tries them in order.
 */
export interface RateSource {
  id: string;
  /** Build the request URL for a currency, or null if unsupported. */
  url(currency: Currency): string | null;
  /** Extract the fiat-per-BTC number from the parsed JSON response. */
  parse(json: unknown, currency: Currency): number | null;
}

const CORS_PROXY = 'https://proxy.shakespeare.diy/?url=';

function proxied(url: string): string {
  return `${CORS_PROXY}${encodeURIComponent(url)}`;
}

/** Coinbase spot price: /v2/prices/BTC-EUR/spot → { data: { amount } }. */
const coinbase: RateSource = {
  id: 'coinbase',
  url: (currency) => proxied(`https://api.coinbase.com/v2/prices/BTC-${currency}/spot`),
  parse: (json) => {
    const amount = (json as { data?: { amount?: string } })?.data?.amount;
    const n = amount ? Number(amount) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  },
};

/** Kraken ticker as a second opinion: /0/public/Ticker?pair=XBTEUR. */
const kraken: RateSource = {
  id: 'kraken',
  url: (currency) => proxied(`https://api.kraken.com/0/public/Ticker?pair=XBT${currency}`),
  parse: (json, currency) => {
    const result = (json as { result?: Record<string, { c?: string[] }> })?.result;
    if (!result) return null;
    // Kraken keys look like "XXBTZEUR"; take the first result entry.
    const key = Object.keys(result).find((k) => k.includes(currency)) ?? Object.keys(result)[0];
    const last = key ? result[key]?.c?.[0] : undefined;
    const n = last ? Number(last) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  },
};

/** The ordered list of rate sources. First success wins. Configurable. */
export const RATE_SOURCES: RateSource[] = [coinbase, kraken];

/** Satoshis in one BTC. */
export const SATS_PER_BTC = 100_000_000;

/**
 * Fetch the current fiat-per-BTC rate for a currency, trying each source in
 * order. Throws only if every source fails.
 */
export async function fetchRate(
  currency: Currency,
  signal?: AbortSignal,
): Promise<RateSnapshot> {
  let lastError: unknown;
  for (const source of RATE_SOURCES) {
    const url = source.url(currency);
    if (!url) continue;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const fiatPerBtc = source.parse(json, currency);
      if (fiatPerBtc && fiatPerBtc > 0) {
        return {
          currency,
          fiatPerBtc,
          as_of: Math.floor(Date.now() / 1000),
          source: source.id,
        };
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Could not fetch BTC/${currency} rate: ${
      lastError instanceof Error ? lastError.message : 'all sources failed'
    }`,
  );
}

/** Convert a fiat amount to satoshis using a rate snapshot. Rounds to a whole sat. */
export function fiatToSats(amount: number, rate: RateSnapshot): number {
  const btc = amount / rate.fiatPerBtc;
  return Math.round(btc * SATS_PER_BTC);
}

/** Convert a fiat amount to millisatoshis (what zap/LNURL amounts use). */
export function fiatToMsat(amount: number, rate: RateSnapshot): number {
  return fiatToSats(amount, rate) * 1000;
}
