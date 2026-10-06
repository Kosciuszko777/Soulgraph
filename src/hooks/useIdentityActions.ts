import { useCallback } from 'react';
import { useLoginActions } from '@/hooks/useLoginActions';
import { generateIdentity, type GeneratedKey } from '@/core/identity/keys';
import { putIdentity, appendAudit } from '@/core/vault/vault';

/**
 * Identity-level actions that sit above the raw login layer: creating an
 * anonymous SoulGraph identity (generate → log in → record metadata) and
 * recording identity origin in the vault.
 */
export function useIdentityActions() {
  const login = useLoginActions();

  /**
   * Create an anonymous SoulGraph: generate a keypair in the browser, log in
   * with it, and record identity metadata in the vault as NOT yet backed up.
   * The caller must present the Key Backup flow before any payment or sync.
   */
  const createAnonymous = useCallback(
    async (displayName?: string): Promise<GeneratedKey> => {
      const key = generateIdentity();
      login.nsec(key.nsec);
      await putIdentity({
        pubkey: key.pubkey,
        display_name: displayName,
        origin: 'anonymous',
        created_at: Math.floor(Date.now() / 1000),
        backed_up: false,
      });
      await appendAudit(key.pubkey, 'identity.created', 'anonymous');
      return key;
    },
    [login],
  );

  /** Record that a Nostr sign-in (extension / remote) owns a vault identity. */
  const recordNostrIdentity = useCallback(async (pubkey: string) => {
    await putIdentity({
      pubkey,
      origin: 'nostr',
      created_at: Math.floor(Date.now() / 1000),
      // Nostr sign-ins manage their own keys; nothing for SoulGraph to back up.
      backed_up: true,
    });
    await appendAudit(pubkey, 'identity.created', 'nostr');
  }, []);

  return { createAnonymous, recordNostrIdentity };
}
