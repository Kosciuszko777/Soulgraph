/**
 * Vault repository (Vault layer).
 *
 * The high-level API over the IndexedDB store + envelope crypto. Everything the
 * app persists goes through here. Plaintext facets are sealed BEFORE they touch
 * storage, and only envelopes are ever returned for sync. See
 * docs/ARCHITECTURE.md §4–§5.
 *
 * Pure TypeScript. No React imports.
 */

import {
  getVaultDB,
  type VaultIdentity,
  type VaultEnvelopeRecord,
  type VaultVersionRecord,
  type VaultAuditRecord,
  type VaultGrantRecord,
} from './db';
import {
  sealFacet,
  openFacet,
  rotateFacetKey,
  rewrapForGrantee,
  type FacetEnvelope,
  type KeyWrapper,
} from './envelope';
import type { FacetKey } from '@/core/graph/schema';

/** Generate an opaque random identifier (hex) for sync `d` tags and ids. */
export function randomId(bytes = 16): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* --------------------------------- identity -------------------------------- */

export async function putIdentity(identity: VaultIdentity): Promise<void> {
  const db = await getVaultDB();
  await db.put('identity', identity);
}

export async function getIdentity(pubkey: string): Promise<VaultIdentity | undefined> {
  const db = await getVaultDB();
  return db.get('identity', pubkey);
}

export async function markBackedUp(pubkey: string): Promise<void> {
  const existing = await getIdentity(pubkey);
  if (!existing) return;
  await putIdentity({ ...existing, backed_up: true });
}

/* ---------------------------------- facets --------------------------------- */

function envelopeId(owner: string, versionId: string, facet: FacetKey): string {
  return `${owner}:${versionId}:${facet}`;
}

/**
 * Seal and persist a single facet for a version. Sealing happens here, so the
 * plaintext payload never reaches storage or any publish path.
 */
export async function saveFacet(
  owner: string,
  versionId: string,
  facet: FacetKey,
  payload: unknown,
  wrapper: KeyWrapper,
): Promise<VaultEnvelopeRecord> {
  const envelope = await sealFacet(payload, owner, wrapper);
  const record: VaultEnvelopeRecord = {
    id: envelopeId(owner, versionId, facet),
    owner_pubkey: owner,
    version_id: versionId,
    facet,
    envelope,
    sync_d: randomId(),
    updated_at: Math.floor(Date.now() / 1000),
  };
  const db = await getVaultDB();
  await db.put('envelopes', record);
  return record;
}

/** Load and decrypt a single facet for the owner. */
export async function loadFacet<T = unknown>(
  owner: string,
  versionId: string,
  facet: FacetKey,
  wrapper: KeyWrapper,
): Promise<T | null> {
  const db = await getVaultDB();
  const record = await db.get('envelopes', envelopeId(owner, versionId, facet));
  if (!record) return null;
  return openFacet<T>(record.envelope, owner, wrapper);
}

/** List all envelope records for an owner (encrypted — safe to enumerate). */
export async function listEnvelopes(owner: string): Promise<VaultEnvelopeRecord[]> {
  const db = await getVaultDB();
  return db.getAllFromIndex('envelopes', 'by_owner', owner);
}

/** Rotate a facet's content key, re-wrapping only for the kept grantees. */
export async function rotateFacet(
  owner: string,
  versionId: string,
  facet: FacetKey,
  wrapper: KeyWrapper,
  keepGrantees: string[] = [],
): Promise<VaultEnvelopeRecord | null> {
  const db = await getVaultDB();
  const record = await db.get('envelopes', envelopeId(owner, versionId, facet));
  if (!record) return null;
  const rotated = await rotateFacetKey(record.envelope, owner, wrapper, keepGrantees);
  const updated: VaultEnvelopeRecord = {
    ...record,
    envelope: rotated,
    sync_d: randomId(), // new opaque id so the old synced copy is orphaned
    updated_at: Math.floor(Date.now() / 1000),
  };
  await db.put('envelopes', updated);
  return updated;
}

/** Re-wrap a facet's content key for an additional grantee. */
export async function shareFacet(
  owner: string,
  versionId: string,
  facet: FacetKey,
  granteePubkey: string,
  wrapper: KeyWrapper,
): Promise<FacetEnvelope | null> {
  const db = await getVaultDB();
  const record = await db.get('envelopes', envelopeId(owner, versionId, facet));
  if (!record) return null;
  const rewrapped = await rewrapForGrantee(record.envelope, owner, granteePubkey, wrapper);
  await db.put('envelopes', { ...record, envelope: rewrapped });
  return rewrapped;
}

/* --------------------------------- versions -------------------------------- */

export async function putVersion(record: VaultVersionRecord): Promise<void> {
  const db = await getVaultDB();
  await db.put('versions', record);
}

export async function listVersions(owner: string): Promise<VaultVersionRecord[]> {
  const db = await getVaultDB();
  const all = await db.getAllFromIndex('versions', 'by_owner', owner);
  return all.sort((a, b) => a.sequence - b.sequence);
}

/* --------------------------------- grants ---------------------------------- */

export async function listGrants(owner: string): Promise<VaultGrantRecord[]> {
  const db = await getVaultDB();
  return db.getAllFromIndex('grants', 'by_owner', owner);
}

/* ---------------------------------- audit ---------------------------------- */

export async function appendAudit(
  owner: string,
  action: string,
  detail?: string,
): Promise<void> {
  const db = await getVaultDB();
  const record: VaultAuditRecord = {
    id: randomId(),
    owner_pubkey: owner,
    at: Math.floor(Date.now() / 1000),
    action,
    detail,
  };
  await db.put('audit', record);
}

export async function listAudit(owner: string): Promise<VaultAuditRecord[]> {
  const db = await getVaultDB();
  const all = await db.getAllFromIndex('audit', 'by_owner', owner);
  return all.sort((a, b) => b.at - a.at);
}

/* ------------------------------- attribution ------------------------------- */

export async function bindAttribution(
  owner: string,
  attribution: {
    ref?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    captured_at: number;
  },
): Promise<void> {
  const db = await getVaultDB();
  const existing = await db.get('attribution', owner);
  if (existing) return; // first-touch wins
  await db.put('attribution', { owner_pubkey: owner, ...attribution });
}
