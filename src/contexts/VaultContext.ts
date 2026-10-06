import { createContext } from 'react';
import type { SoulGraph } from '@/core/graph/schema';
import type { VaultIdentity } from '@/core/vault/db';

/** Vault lock state. Decrypted data exists ONLY when state is `unlocked`. */
export type VaultState = 'empty' | 'locked' | 'unlocking' | 'unlocked';

export interface VaultContextType {
  /** Current lock state. */
  state: VaultState;
  /** The vault identity, once known. */
  identity: VaultIdentity | null;
  /**
   * The decrypted current SoulGraph, held ONLY in memory while unlocked.
   * Null when locked, empty, or not yet loaded.
   */
  currentGraph: SoulGraph | null;
  /** Whether a load/decrypt is in flight. */
  loading: boolean;
  /** Load + decrypt the current graph into memory (requires an unlocked signer). */
  unlock: () => Promise<void>;
  /** Clear all decrypted data from memory immediately. */
  lock: () => void;
  /** Re-read identity + metadata from the vault (no decryption). */
  refresh: () => Promise<void>;
}

export const VaultContext = createContext<VaultContextType | undefined>(undefined);
