import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  referralCodeForPubkey,
  referralLink,
  shortReferralCode,
} from '@/core/referral/attribution';

export interface ReferralInfo {
  /** The user's referral code (their npub), or null when logged out. */
  code: string | null;
  /** A short, display-only form of the code. */
  shortCode: string | null;
  /** The full referral link `${origin}/?ref=<code>`, or null when logged out. */
  link: string | null;
  /**
   * The number of attributed sign-ups, or null when it cannot be computed
   * honestly. Phase I has no ledger/index, so this is null: we show "rewards
   * launch soon" rather than invent a number we cannot stand behind.
   */
  attributedCount: number | null;
}

/**
 * Every user gets a referral link. Phase I records attribution only; the
 * commission ledger and payouts arrive in Phase VII. We never fabricate a
 * count — `attributedCount` is null because it cannot be computed honestly on
 * the client without a trusted index. See docs/ARCHITECTURE.md §11.
 */
export function useReferral(): ReferralInfo {
  const { user } = useCurrentUser();

  return useMemo(() => {
    if (!user?.pubkey) {
      return { code: null, shortCode: null, link: null, attributedCount: null };
    }
    const code = referralCodeForPubkey(user.pubkey);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      code,
      shortCode: shortReferralCode(code),
      link: referralLink(origin, code),
      attributedCount: null,
    };
  }, [user?.pubkey]);
}
