import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulSigner } from '@/hooks/useSoulSigner';
import { useLoginActions } from '@/hooks/useLoginActions';
import { wipeVaultDB, getVaultDB } from '@/core/vault/db';
import { buildDeletionEvent, ENVELOPE_KIND } from '@/core/vault/sync';
import {
  SYNC_SETTINGS_KEY,
  DEFAULT_SYNC_SETTINGS,
  type SyncSettings,
} from '@/core/vault/sync';

function readSyncSettings(): SyncSettings {
  try {
    const raw = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (!raw) return DEFAULT_SYNC_SETTINGS;
    return { ...DEFAULT_SYNC_SETTINGS, ...(JSON.parse(raw) as Partial<SyncSettings>) };
  } catch {
    return DEFAULT_SYNC_SETTINGS;
  }
}

/**
 * Panic delete. If sync was ever enabled, publish NIP-09 deletion requests for
 * every synced vault/grant event FIRST, then wipe IndexedDB, localStorage,
 * sessionStorage and caches, then log out. The UI must then show an honest
 * message that relays may retain encrypted copies they cannot read.
 * See docs/ARCHITECTURE.md §8.
 */
export function usePanicDelete() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const signer = useSoulSigner();
  const { logout } = useLoginActions();

  return useCallback(async () => {
    const sync = readSyncSettings();

    // 1. Best-effort deletion requests for synced events (if sync was used).
    if (sync.relays.length > 0 && user && signer) {
      try {
        const group = nostr.group(sync.relays);
        const events = await group.query(
          [{ kinds: [ENVELOPE_KIND, 30078], authors: [user.pubkey] }],
          { signal: AbortSignal.timeout(10_000) },
        );
        const ids = events.map((e) => e.id).filter(Boolean);
        if (ids.length > 0) {
          const signed = await signer.signEvent(buildDeletionEvent(ids));
          await group.event(signed, { signal: AbortSignal.timeout(10_000) });
        }
      } catch (err) {
        // Deletion is best-effort; proceed with local wipe regardless.
        console.warn('Panic delete: remote deletion requests failed', err);
      }
    }

    // 2. Wipe the vault database.
    try {
      // Clear any object stores first in case deleteDatabase is blocked.
      const db = await getVaultDB();
      for (const store of db.objectStoreNames) {
        await db.clear(store);
      }
    } catch {
      /* ignore */
    }
    await wipeVaultDB().catch(() => undefined);

    // 3. Wipe localStorage and sessionStorage.
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }

    // 4. Wipe Cache Storage.
    try {
      if ('caches' in globalThis) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }

    // 5. Log out (removes the login from storage too).
    try {
      await logout();
    } catch {
      /* ignore */
    }
  }, [nostr, user, signer, logout]);
}
