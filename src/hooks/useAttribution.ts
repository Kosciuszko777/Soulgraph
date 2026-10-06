import { useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  ATTRIBUTION_STORAGE_KEY,
  parseAttribution,
  type Attribution,
} from '@/core/referral/attribution';

/**
 * First-touch referral attribution. Captures `?ref=` + UTM params from the URL
 * ONCE (first touch wins) and persists them locally. Later phases bind this to
 * the user's pubkey and stamp it into zap requests. See docs/ARCHITECTURE.md §11.
 */
export function useAttribution(): Attribution | null {
  const [attribution, setAttribution] = useLocalStorage<Attribution | null>(
    ATTRIBUTION_STORAGE_KEY,
    null,
  );

  useEffect(() => {
    // First touch wins: never overwrite an existing attribution.
    if (attribution) return;
    if (typeof window === 'undefined') return;

    const captured = parseAttribution(window.location.search, Math.floor(Date.now() / 1000));
    if (captured) {
      setAttribution(captured);
    }
    // Only run on mount; subsequent navigations must not overwrite first touch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return attribution;
}
