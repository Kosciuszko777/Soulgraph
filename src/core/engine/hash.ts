/**
 * Deterministic response hashing (Engine layer).
 *
 * The same responses always produce the same hash, every run, so a graph can be
 * identified with — and re-scored from — the exact inputs that created it. We
 * canonicalize (sort keys, normalize shapes) before hashing so that ordering or
 * key-order differences never change the result. See docs/ARCHITECTURE.md §2.
 *
 * Synchronous SHA-256 via @noble/hashes (no async, no WebCrypto dependency),
 * keeping the engine fully deterministic and Node/worker-portable.
 */

import { sha256 } from '@noble/hashes/sha2';
import type { ResponseSet } from './types';

const te = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** Stable JSON stringify with sorted object keys at every level. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/**
 * Canonicalize a ResponseSet into a stable form: responses sorted by item id,
 * timing excluded (timing is metadata, not an input to the scored values — it
 * only affects confidence, which is recomputed, so excluding it keeps the hash
 * stable across identical answers taken at different speeds).
 */
export function canonicalResponses(set: ResponseSet): string {
  const sorted = [...set.responses]
    .map((r) => ({ item_id: r.item_id, value: r.value }))
    .sort((a, b) => (a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : 0));
  return canonicalize({ responses: sorted, birth_date: set.birth_date ?? null });
}

/** Deterministic 64-char hex SHA-256 of a response set. */
export function hashResponses(set: ResponseSet): string {
  return bytesToHex(sha256(te.encode(canonicalResponses(set))));
}
