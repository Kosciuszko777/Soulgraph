/**
 * SoulGraph — referral attribution (first-touch).
 *
 * Captures `?ref=<npub or code>` plus UTM params at first touch, stores them
 * locally, binds them to the user's pubkey when identity is created, and is
 * carried as a tag in every zap request. Phase I RECORDS attribution only; the
 * commission ledger and payouts arrive in Phase VII. See docs/ARCHITECTURE.md §11.
 *
 * Pure TypeScript. No React imports (a thin hook wraps this for the UI).
 */

import { nip19 } from 'nostr-tools';

export interface Attribution {
  /** Raw referral code or npub from ?ref=. */
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Unix seconds of first touch. */
  captured_at: number;
  /** Bound owner pubkey once identity exists. */
  owner_pubkey?: string;
}

export const ATTRIBUTION_STORAGE_KEY = 'soulgraph:attribution';

/** Parse attribution params from a URL search string (first-touch only). */
export function parseAttribution(search: string, now: number): Attribution | null {
  const params = new URLSearchParams(search);
  const ref = params.get('ref') ?? undefined;
  const utm_source = params.get('utm_source') ?? undefined;
  const utm_medium = params.get('utm_medium') ?? undefined;
  const utm_campaign = params.get('utm_campaign') ?? undefined;
  const utm_content = params.get('utm_content') ?? undefined;
  const utm_term = params.get('utm_term') ?? undefined;

  if (!ref && !utm_source && !utm_medium && !utm_campaign && !utm_content && !utm_term) {
    return null;
  }

  return {
    ref,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    captured_at: now,
  };
}

/**
 * The canonical referral code for a pubkey: its npub. The npub IS the referral
 * code — it resolves deterministically back to the referrer's pubkey, which is
 * exactly what the Phase VII ledger will need. We do not invent an opaque code
 * that would require a lookup table (there is no server to hold one).
 */
export function referralCodeForPubkey(pubkey: string): string {
  return nip19.npubEncode(pubkey);
}

/**
 * A short, human-friendly label for a referral code, for display only (e.g. on
 * the Invite panel). Never used for resolution — always resolve the full code.
 */
export function shortReferralCode(code: string): string {
  if (code.length <= 16) return code;
  return `${code.slice(0, 10)}…${code.slice(-4)}`;
}

/**
 * Resolve a referral code (an npub, nprofile, or bare hex pubkey) to a hex
 * pubkey, or null if it cannot be resolved. This is how attribution is bound to
 * a real referrer and how self-referral is detected.
 */
export function resolveRefToPubkey(ref: string | undefined): string | null {
  if (!ref) return null;
  const value = ref.trim();
  // Bare 64-char hex pubkey.
  if (/^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
  try {
    const decoded = nip19.decode(value);
    if (decoded.type === 'npub') return decoded.data;
    if (decoded.type === 'nprofile') return decoded.data.pubkey;
  } catch {
    // Not a NIP-19 code — not resolvable.
  }
  return null;
}

/**
 * Whether an attribution is a self-referral for `ownerPubkey` (same person
 * referred themselves). Self-referrals are IGNORED — never attributed, never
 * stamped into a payment.
 */
export function isSelfReferral(attr: Attribution | null, ownerPubkey: string): boolean {
  if (!attr?.ref) return false;
  const refPubkey = resolveRefToPubkey(attr.ref);
  return refPubkey !== null && refPubkey === ownerPubkey.toLowerCase();
}

/**
 * Build the referral link a user shares (carried on the share card and
 * one-pager). When `ref` is omitted the bare origin is returned (still
 * shareable, just unattributed).
 */
export function referralLink(origin: string, ref?: string): string {
  const base = origin.replace(/\/+$/, '');
  if (!ref) return base + '/';
  const params = new URLSearchParams({ ref });
  return `${base}/?${params.toString()}`;
}

/**
 * Convert an attribution record into zap-request tags so that attribution is
 * recorded at payment time. Only non-empty fields are emitted.
 *
 * `ownerPubkey`, when provided, suppresses a self-referral `ref` tag: a user
 * cannot earn a commission by referring themselves. UTM tags are always kept —
 * they describe the campaign, not a payee.
 */
export function attributionTags(
  attr: Attribution | null,
  ownerPubkey?: string,
): string[][] {
  if (!attr) return [];
  const tags: string[][] = [];
  const selfReferral =
    ownerPubkey !== undefined && isSelfReferral(attr, ownerPubkey);
  if (attr.ref && !selfReferral) tags.push(['soulgraph_ref', attr.ref]);
  if (attr.utm_source) tags.push(['soulgraph_utm_source', attr.utm_source]);
  if (attr.utm_medium) tags.push(['soulgraph_utm_medium', attr.utm_medium]);
  if (attr.utm_campaign) tags.push(['soulgraph_utm_campaign', attr.utm_campaign]);
  if (attr.utm_content) tags.push(['soulgraph_utm_content', attr.utm_content]);
  if (attr.utm_term) tags.push(['soulgraph_utm_term', attr.utm_term]);
  return tags;
}
