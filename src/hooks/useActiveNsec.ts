import { useMemo } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { getPublicKey } from 'nostr-tools';
import { decodeNsec } from '@/core/identity/keys';

/**
 * The active login's nsec + secret key, when (and only when) the user is logged
 * in with a LOCAL nsec key that SoulGraph holds. Extension / remote (NIP-46)
 * logins never expose a secret key here — they manage their own keys, and for
 * them key backup is the signer's responsibility, not ours.
 *
 * Used only for the required Key Backup step before payment. Never logged,
 * never sent anywhere.
 */
export function useActiveNsec(): { nsec: string; sk: Uint8Array; pubkey: string } | null {
  const { logins } = useNostrLogin();

  return useMemo(() => {
    const login = logins[0];
    if (!login || login.type !== 'nsec') return null;
    // The nsec login stores the key material in `data` as an nsec string.
    const data = (login as unknown as { data?: unknown }).data;
    if (typeof data !== 'string' || !data.startsWith('nsec1')) return null;
    try {
      const sk = decodeNsec(data);
      return { nsec: data, sk, pubkey: getPublicKey(sk) };
    } catch {
      return null;
    }
  }, [logins]);
}
