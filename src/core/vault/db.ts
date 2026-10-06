/**
 * Vault — IndexedDB store (Vault layer).
 *
 * Local-first primary store. Holds, per owner pubkey: identity metadata,
 * SoulGraph versions, facet envelopes, assessment sessions, grants, audit
 * events, and referral attribution. Encrypted envelopes are the only thing
 * that may ever be synced to relays. See docs/ARCHITECTURE.md §5.
 *
 * Pure TypeScript (idb wrapper). No React imports.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FacetEnvelope } from './envelope';
import type { Confidence, FacetKey, Provenance } from '@/core/graph/schema';

export const VAULT_DB_NAME = 'soulgraph-vault';
export const VAULT_DB_VERSION = 1;

/** Identity metadata (never the secret key — that lives in the login layer). */
export interface VaultIdentity {
  pubkey: string;
  display_name?: string;
  /** How this identity was established. */
  origin: 'anonymous' | 'nostr';
  created_at: number;
  /** Whether the user has completed the required key-backup step. */
  backed_up: boolean;
}

/** A persisted, immutable SoulGraph version (metadata only; facets are envelopes). */
export interface VaultVersionRecord {
  /** Composite key `${owner}:${version_id}`. */
  id: string;
  owner_pubkey: string;
  version_id: string;
  sequence: number;
  created_at: number;
  /** Whether this version is the current pointer. */
  is_current: boolean;
  /**
   * Derived, non-psychological metadata kept alongside the version so the
   * unlocked graph is faithful without decrypting every facet first. These are
   * numbers and a response hash — never raw answers or facet content.
   */
  confidence?: Confidence;
  provenance?: Provenance;
  /** Optional display name snapshot at the time the version was created. */
  display_name?: string;
}

/** A sealed facet envelope for one (version, facet). */
export interface VaultEnvelopeRecord {
  /** Composite key `${owner}:${version_id}:${facet}`. */
  id: string;
  owner_pubkey: string;
  version_id: string;
  facet: FacetKey;
  envelope: FacetEnvelope;
  /** Opaque random identifier used as the NIP-78 `d` tag when synced. */
  sync_d: string;
  updated_at: number;
}

/** A raw assessment session (answers kept locally; only hashes go into provenance). */
export interface VaultSessionRecord {
  id: string;
  owner_pubkey: string;
  /** Encrypted (to self) JSON blob of raw responses. */
  envelope: FacetEnvelope;
  created_at: number;
  completed_at?: number;
}

/** A permission grant record (encrypted payload lives in the envelope). */
export interface VaultGrantRecord {
  id: string;
  owner_pubkey: string;
  grantee_pubkey: string;
  envelope: FacetEnvelope;
  sync_d: string;
  updated_at: number;
}

/** An append-only audit event. */
export interface VaultAuditRecord {
  id: string;
  owner_pubkey: string;
  at: number;
  action: string;
  detail?: string;
}

/** First-touch referral attribution, bound to the owner. */
export interface VaultAttributionRecord {
  owner_pubkey: string;
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  captured_at: number;
}

interface VaultDB extends DBSchema {
  identity: { key: string; value: VaultIdentity };
  versions: {
    key: string;
    value: VaultVersionRecord;
    indexes: { by_owner: string };
  };
  envelopes: {
    key: string;
    value: VaultEnvelopeRecord;
    indexes: { by_owner: string; by_version: string };
  };
  sessions: {
    key: string;
    value: VaultSessionRecord;
    indexes: { by_owner: string };
  };
  grants: {
    key: string;
    value: VaultGrantRecord;
    indexes: { by_owner: string };
  };
  audit: {
    key: string;
    value: VaultAuditRecord;
    indexes: { by_owner: string };
  };
  attribution: { key: string; value: VaultAttributionRecord };
}

let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

/** Open (or create) the vault database. Safe to call repeatedly. */
export function getVaultDB(): Promise<IDBPDatabase<VaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(VAULT_DB_NAME, VAULT_DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('identity', { keyPath: 'pubkey' });

        const versions = db.createObjectStore('versions', { keyPath: 'id' });
        versions.createIndex('by_owner', 'owner_pubkey');

        const envelopes = db.createObjectStore('envelopes', { keyPath: 'id' });
        envelopes.createIndex('by_owner', 'owner_pubkey');
        envelopes.createIndex('by_version', 'version_id');

        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('by_owner', 'owner_pubkey');

        const grants = db.createObjectStore('grants', { keyPath: 'id' });
        grants.createIndex('by_owner', 'owner_pubkey');

        const audit = db.createObjectStore('audit', { keyPath: 'id' });
        audit.createIndex('by_owner', 'owner_pubkey');

        db.createObjectStore('attribution', { keyPath: 'owner_pubkey' });
      },
    });
  }
  return dbPromise;
}

/** Wipe the entire vault database (used by panic delete). */
export async function wipeVaultDB(): Promise<void> {
  // Close any open connection so deleteDB doesn't block.
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(VAULT_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

export type { VaultDB };
