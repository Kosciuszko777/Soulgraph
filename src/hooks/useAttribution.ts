import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  ATTRIBUTION_STORAGE_KEY,
  isSelfReferral,
  parseAttribution,
  type Attribution,
} from '@/core/referral/attribution';
import { bindAttribution } from '@/core/vault/vault';

/**
 * First-touch referral attribution. Captures `?ref=` + UTM params from the URL
 * ONCE (first touch wins) and persists them locally. When an identity exists,
 * the attribution is bound to the user's pubkey in the vault (first-touch wins
 * there too) UNLESS it is a self-referral, which is ignored entirely. See
 * docs/ARCHITECTURE.md §11.
 */
export function useAttribution(): Attribution | null {
  const { user } = useCurrentUser();
  const [attribution, setAttribution] = useLocalStorage<Attribution | null>(
    ATTRIBUTION_STORAGE_KEY,
    null,
  );

  // Capture first touch from the URL (mount only).
  useEffect(() => {
    if (attribution) return;
    if (typeof window === 'undefined') return;

    const captured = parseAttribution(window.location.search, Math.floor(Date.now() / 1000));
    if (captured) {
      setAttribution(captured);
    }
    // Only run on mount; subsequent navigations must not overwrite first touch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bind to the pubkey once an identity exists. Self-referrals are dropped.
  const pubkey = user?.pubkey;
  useEffect(() => {
    if (!pubkey || !attribution) return;
    if (attribution.owner_pubkey === pubkey) return;
    if (isSelfReferral(attribution, pubkey)) return;

    const bound: Attribution = { ...attribution, owner_pubkey: pubkey };
    setAttribution(bound);
    void bindAttribution(pubkey, {
      ref: bound.ref,
      utm_source: bound.utm_source,
      utm_medium: bound.utm_medium,
      utm_campaign: bound.utm_campaign,
      captured_at: bound.captured_at,
    });
    // setAttribution identity is stable enough for this one-shot bind.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubkey, attribution?.ref]);

  return attribution;
}
