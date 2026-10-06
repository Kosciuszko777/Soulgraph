import { useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  encryptToNcryptsec,
  decryptNcryptsec,
  decodeNsec,
  skToNsec,
} from '@/core/identity/keys';
import { appendAudit } from '@/core/vault/vault';

interface LockedKey {
  pubkey: string;
  ncryptsec: string;
}

export const PASSPHRASE_LOCK_KEY = 'soulgraph:locked-key';

/**
 * Optional local passphrase lock for ANONYMOUS identities. When enabled, the
 * secret key is stored only as an NIP-49 ncryptsec, the plaintext nsec login is
 * removed, and the key is unlocked per session with the passphrase. This trades
 * convenience for the plaintext-nsec-in-localStorage risk (see AGENTS.md).
 *
 * Only applies to keys SoulGraph holds locally (nsec logins). Extension/remote
 * signers manage their own keys and are never touched here.
 */
export function usePassphraseLock() {
  const { user } = useCurrentUser();
  const { nsec: nsecLogin, logout } = useLoginActions();
  const [locked, setLocked] = useLocalStorage<LockedKey | null>(
    PASSPHRASE_LOCK_KEY,
    null,
  );

  const isLockConfigured = locked !== null;

  /**
   * Enable the passphrase lock. Requires the current nsec (the caller must have
   * it available — e.g. from the just-generated key or a backup). Stores an
   * ncryptsec and clears the plaintext login.
   */
  const enableLock = useCallback(
    async (nsec: string, passphrase: string) => {
      const sk = decodeNsec(nsec);
      const pubkey = user?.pubkey ?? '';
      const ncryptsec = encryptToNcryptsec(sk, passphrase);
      setLocked({ pubkey, ncryptsec });
      if (pubkey) await appendAudit(pubkey, 'identity.lock_enabled');
      // Remove the plaintext nsec login; the key now lives only as ncryptsec.
      await logout();
    },
    [user?.pubkey, setLocked, logout],
  );

  /** Lock the current session: log out but keep the ncryptsec on disk. */
  const lockSession = useCallback(async () => {
    await logout();
  }, [logout]);

  /** Unlock for this session: decrypt the ncryptsec and log in with the nsec. */
  const unlockSession = useCallback(
    async (passphrase: string): Promise<boolean> => {
      if (!locked) return false;
      try {
        const sk = decryptNcryptsec(locked.ncryptsec, passphrase);
        nsecLogin(skToNsec(sk));
        return true;
      } catch {
        return false;
      }
    },
    [locked, nsecLogin],
  );

  /** Remove the passphrase lock entirely (requires a successful unlock first). */
  const disableLock = useCallback(() => {
    setLocked(null);
  }, [setLocked]);

  return {
    isLockConfigured,
    lockedPubkey: locked?.pubkey ?? null,
    enableLock,
    lockSession,
    unlockSession,
    disableLock,
  };
}
