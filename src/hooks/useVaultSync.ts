import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulSigner } from '@/hooks/useSoulSigner';
import {
  SYNC_SETTINGS_KEY,
  DEFAULT_SYNC_SETTINGS,
  type SyncSettings,
  buildEnvelopeEvent,
  assertSealedContent,
  parseEnvelopeEvent,
  ENVELOPE_KIND,
} from '@/core/vault/sync';
import { listEnvelopes, randomId } from '@/core/vault/vault';
import { getVaultDB } from '@/core/vault/db';

/**
 * Per-device vault sync. OFF by default. When enabled, publishes ONLY encrypted
 * envelopes (NIP-78 kind 30078, opaque `d` tags) to a separate, user-chosen
 * relay list, and can restore them on a new device after login.
 */
export function useVaultSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const signer = useSoulSigner();
  const [settings, setSettings] = useLocalStorage<SyncSettings>(
    SYNC_SETTINGS_KEY,
    DEFAULT_SYNC_SETTINGS,
  );

  const setEnabled = useCallback(
    (enabled: boolean) => setSettings((s) => ({ ...s, enabled })),
    [setSettings],
  );

  const setRelays = useCallback(
    (relays: string[]) => setSettings((s) => ({ ...s, relays })),
    [setSettings],
  );

  /** Publish all of the owner's encrypted envelopes to the sync relays. */
  const pushAll = useCallback(async () => {
    if (!settings.enabled || !user || !signer || settings.relays.length === 0) return;
    const group = nostr.group(settings.relays);
    const records = await listEnvelopes(user.pubkey);

    for (const record of records) {
      const template = buildEnvelopeEvent(record);
      // Defense-in-depth: never let a non-sealed payload reach a publish call.
      assertSealedContent(template.content);
      const signed = await signer.signEvent(template);
      await group.event(signed, { signal: AbortSignal.timeout(10_000) });
    }
  }, [nostr, settings.enabled, settings.relays, user, signer]);

  /**
   * Restore encrypted envelopes from the sync relays onto this device. Stores
   * them in the vault (still encrypted); decryption happens later via unlock.
   */
  const restore = useCallback(async () => {
    if (!user || settings.relays.length === 0) return 0;
    const group = nostr.group(settings.relays);
    const events = await group.query(
      [{ kinds: [ENVELOPE_KIND], authors: [user.pubkey] }],
      { signal: AbortSignal.timeout(15_000) },
    );

    const db = await getVaultDB();
    let restored = 0;
    for (const event of events) {
      const parsed = parseEnvelopeEvent(event);
      if (!parsed) continue;
      // Restored envelopes carry no facet/version mapping; store under a
      // recovery id so the user can re-decrypt and re-file them after unlock.
      await db.put('envelopes', {
        id: `${user.pubkey}:recovered:${parsed.sync_d}`,
        owner_pubkey: user.pubkey,
        version_id: 'recovered',
        facet: 'soulgraph_core',
        envelope: parsed.envelope,
        sync_d: parsed.sync_d || randomId(),
        updated_at: Math.floor(Date.now() / 1000),
      });
      restored++;
    }
    return restored;
  }, [nostr, settings.relays, user]);

  return {
    enabled: settings.enabled,
    relays: settings.relays,
    setEnabled,
    setRelays,
    pushAll,
    restore,
  };
}
