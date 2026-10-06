/**
 * SoulGraph — product catalog & pricing (configuration layer).
 *
 * Prices, currencies and commission rates are DATA, never hard-coded in UI or
 * logic. Changing a price here must be the only change required. See
 * docs/ARCHITECTURE.md §10–§11 and docs/SOULGRAPH.md "The pricing ladder".
 *
 * Nothing in this file imports React. It is plain configuration + types.
 */

export type Currency = "EUR" | "CHF";

export type BillingInterval = "one_time" | "monthly" | "yearly";

export interface Price {
  /** Currency of this price. */
  currency: Currency;
  /** Amount in major units (e.g. 4.99 means 4.99 EUR). */
  amount: number;
  /** Billing interval. */
  interval: BillingInterval;
}

export interface Product {
  /** Stable product id; stamped into zap requests for entitlement verification. */
  id: string;
  /** Short name for display. */
  name: string;
  /** One-line description. */
  tagline: string;
  /** The progression stage this product serves. */
  stage: "person" | "pair" | "team" | "organization";
  /** Available prices (e.g. monthly + yearly). Empty for the free tier. */
  prices: Price[];
  /**
   * Referral commission rate (0–1) for THIS product. Per-product, not global.
   * Phase I records attribution only; the ledger & payouts arrive in Phase VII.
   */
  referral_commission_rate: number;
}

/**
 * Price version. Stamped into zap requests alongside the product id so that an
 * entitlement can be validated against the exact price the user paid. Bump this
 * whenever any price below changes.
 */
export const PRICE_VERSION = "2026.01" as const;

/** Marketplace commission (configured SEPARATELY from referral commission). */
export const MARKETPLACE_COMMISSION_RATE = 0.2;

/** Default recurring referral commission rate, overridable per product. */
export const DEFAULT_REFERRAL_COMMISSION_RATE = 0.3;

/** Minimum group size for any aggregate (team/org) view. See §9. */
export const MIN_AGGREGATION_GROUP = 5;

/**
 * The pricing ladder. All amounts/currencies/intervals are editable here.
 */
export const CATALOG: Product[] = [
  {
    id: "demo",
    name: "Free Demo",
    tagline: "A 15-question glimpse of your SoulGraph.",
    stage: "person",
    prices: [],
    referral_commission_rate: 0,
  },
  {
    id: "complete_soulgraph",
    name: "Complete SoulGraph",
    tagline: "The full assessment, scored on your device.",
    stage: "person",
    prices: [{ currency: "EUR", amount: 4.99, interval: "one_time" }],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "deep_soulgraph",
    name: "Deep SoulGraph",
    tagline: "Extended depth across every facet.",
    stage: "person",
    prices: [{ currency: "EUR", amount: 19, interval: "one_time" }],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "personal",
    name: "Personal",
    tagline: "Ongoing personal intelligence.",
    stage: "person",
    prices: [
      { currency: "CHF", amount: 9, interval: "monthly" },
      { currency: "CHF", amount: 79, interval: "yearly" },
    ],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pairs, teams and professional comparison.",
    stage: "pair",
    prices: [
      { currency: "CHF", amount: 29, interval: "monthly" },
      { currency: "CHF", amount: 199, interval: "yearly" },
    ],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For coaches and practitioners.",
    stage: "team",
    prices: [
      { currency: "CHF", amount: 89, interval: "monthly" },
      { currency: "CHF", amount: 799, interval: "yearly" },
    ],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "organization",
    name: "Organization",
    tagline: "Aggregate intelligence at organizational scale.",
    stage: "organization",
    prices: [{ currency: "CHF", amount: 499, interval: "monthly" }],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
];

/** Look up a product by id. */
export function getProduct(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}

/** Format a price for display, e.g. "€4.99" or "CHF 9/mo". */
export function formatPrice(price: Price): string {
  const symbol = price.currency === "EUR" ? "€" : "CHF ";
  const amount =
    price.currency === "EUR" ? price.amount.toFixed(2) : String(price.amount);
  const suffix =
    price.interval === "monthly"
      ? "/mo"
      : price.interval === "yearly"
        ? "/yr"
        : "";
  return `${symbol}${amount}${suffix}`;
}
