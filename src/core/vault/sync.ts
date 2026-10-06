/**
 * Vault sync (Vault layer) — OFF by default.
 *
 * When the user opts in per device, encrypted facet envelopes are published as
 * NIP-78 addressable app-data events (kind 30078) with OPAQUE random `d` tags,
 * to a SEPARATE, user-chosen relay list (a private/paid relay is recommended).
 * Nothing psychological is ever published unencrypted. See
 * docs/ARCHITECTURE.md §5 and docs/NIP-SOULGRAPH.md.
 *
 * Pure TypeScript helpers (event construction / parsing). No React imports.
 */

import type { NostrEvent } from '@nostrify/nostrify';
import type { FacetEnvelope } from './envelope';
import type { VaultEnvelopeRecord } from './db';

/** NIP-78 addressable kind reused for encrypted envelope storage. */
export const ENVELOPE_KIND = 30078;

export interface SyncSettings {
  /** Master switch. OFF by default. */
  enabled: boolean;
  /** Relay URLs chosen specifically for vault sync (separate from app relays). */
  relays: string[];
}

export const SYNC_SETTINGS_KEY = 'soulgraph:sync';

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  relays: [],
};

/**
 * Build the UNSIGNED NIP-78 event for a sealed envelope record. The content is
 * the already-encrypted envelope JSON; the `d` tag is the opaque sync id. No
 * facet name, version number, or any psychological metadata appears in tags.
 */
export function buildEnvelopeEvent(record: VaultEnvelopeRecord): {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
} {
  return {
    kind: ENVELOPE_KIND,
    content: JSON.stringify(record.envelope),
    tags: [
      ['d', record.sync_d],
      ['alt', 'SoulGraph encrypted facet envelope'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Guard: throw if an envelope-event content is not a sealed envelope. Defends
 * against accidentally publishing plaintext through the sync path.
 */
export function assertSealedContent(content: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Sync content is not JSON — refusing to publish.');
  }
  const env = parsed as Partial<FacetEnvelope>;
  if (env.alg !== 'AES-256-GCM' || typeof env.ciphertext !== 'string' || !env.wrapped_keys) {
    throw new Error('Sync content is not a sealed envelope — refusing to publish.');
  }
}

/** Parse a NIP-78 envelope event back into a FacetEnvelope (for restore). */
export function parseEnvelopeEvent(event: NostrEvent): { sync_d: string; envelope: FacetEnvelope } | null {
  if (event.kind !== ENVELOPE_KIND) return null;
  const d = event.tags.find(([n]) => n === 'd')?.[1];
  if (!d) return null;
  try {
    const envelope = JSON.parse(event.content) as FacetEnvelope;
    if (envelope.alg !== 'AES-256-GCM') return null;
    return { sync_d: d, envelope };
  } catch {
    return null;
  }
}

/** Build a NIP-09 deletion request for a set of event ids. */
export function buildDeletionEvent(eventIds: string[]): {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
} {
  return {
    kind: 5,
    content: 'SoulGraph vault deletion',
    tags: eventIds.map((id) => ['e', id]),
    created_at: Math.floor(Date.now() / 1000),
  };
}
