import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SoulSigner, type NostrifySignerLike } from '@/core/identity/SoulSigner';

/**
 * Returns a SoulSigner wrapping the active user's Nostrify signer, or null when
 * no user is logged in. All SoulGraph crypto must go through this adapter.
 */
export function useSoulSigner(): SoulSigner | null {
  const { user } = useCurrentUser();

  return useMemo(() => {
    if (!user?.signer) return null;
    return new SoulSigner(user.signer as unknown as NostrifySignerLike);
  }, [user?.signer]);
}
