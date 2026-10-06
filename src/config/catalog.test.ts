import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  COMPLETE_SOULGRAPH_ID,
  DEFAULT_REFERRAL_COMMISSION_RATE,
  MARKETPLACE_COMMISSION_RATE,
  getProduct,
  primaryPrice,
  purchasableProducts,
  referralCommissionRate,
  validateCatalog,
  formatPrice,
} from './catalog';

describe('catalog validation', () => {
  it('the shipped catalog is internally consistent', () => {
    expect(validateCatalog()).toEqual([]);
  });

  it('catches a duplicate product id', () => {
    const dup = [...CATALOG, { ...CATALOG[0] }];
    expect(validateCatalog(dup)).toContain(`duplicate product id: ${CATALOG[0].id}`);
  });

  it('catches a purchasable product with no price', () => {
    const bad = [
      {
        ...CATALOG[0],
        id: 'bad',
        purchasable: true,
        phase: 1 as const,
        prices: [],
      },
    ];
    expect(validateCatalog(bad)).toContain('bad: purchasable but has no price');
  });

  it('catches a purchasable product outside Phase I', () => {
    const bad = [
      {
        ...CATALOG[1],
        id: 'bad2',
        purchasable: true,
        phase: 2 as const,
      },
    ];
    expect(validateCatalog(bad)).toContain('bad2: purchasable but not Phase I (phase 2)');
  });

  it('catches a referral rate out of range', () => {
    const bad = [{ ...CATALOG[1], id: 'bad3', referral_commission_rate: 1.5 }];
    expect(validateCatalog(bad)).toContain('bad3: referral_commission_rate out of range [0,1]');
  });
});

describe('catalog helpers', () => {
  it('complete_soulgraph is the purchasable €4.99 product', () => {
    const product = getProduct(COMPLETE_SOULGRAPH_ID);
    expect(product).toBeDefined();
    expect(product!.purchasable).toBe(true);
    const price = primaryPrice(product!);
    expect(price).toEqual({ currency: 'EUR', amount: 4.99, interval: 'one_time' });
  });

  it('only Phase I products are purchasable', () => {
    for (const p of purchasableProducts()) {
      expect(p.phase).toBe(1);
    }
  });

  it('referralCommissionRate falls back to the default for out-of-range values', () => {
    const product = { ...CATALOG[1], referral_commission_rate: Number.NaN };
    expect(referralCommissionRate(product)).toBe(DEFAULT_REFERRAL_COMMISSION_RATE);
  });

  it('marketplace commission is configured separately from referral commission', () => {
    expect(MARKETPLACE_COMMISSION_RATE).not.toBe(DEFAULT_REFERRAL_COMMISSION_RATE);
    expect(MARKETPLACE_COMMISSION_RATE).toBeGreaterThan(0);
    expect(MARKETPLACE_COMMISSION_RATE).toBeLessThan(1);
  });

  it('formats fiat prices in their own currency', () => {
    expect(formatPrice({ currency: 'EUR', amount: 4.99, interval: 'one_time' })).toBe('€4.99');
    expect(formatPrice({ currency: 'CHF', amount: 9, interval: 'monthly' })).toBe('CHF 9/mo');
    expect(formatPrice({ currency: 'CHF', amount: 79, interval: 'yearly' })).toBe('CHF 79/yr');
  });
});
