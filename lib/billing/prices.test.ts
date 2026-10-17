import { afterEach, describe, expect, it } from 'vitest';
import { getPlanPriceIds, isConfiguredPriceId, planForPriceId } from './prices';

const originalPro = process.env.STRIPE_PRICE_PRO;
const originalEnterprise = process.env.STRIPE_PRICE_ENTERPRISE;

afterEach(() => {
  if (originalPro === undefined) delete process.env.STRIPE_PRICE_PRO;
  else process.env.STRIPE_PRICE_PRO = originalPro;
  if (originalEnterprise === undefined) delete process.env.STRIPE_PRICE_ENTERPRISE;
  else process.env.STRIPE_PRICE_ENTERPRISE = originalEnterprise;
});

describe('Stripe price mapping', () => {
  it('maps configured prices back to plans', () => {
    process.env.STRIPE_PRICE_PRO = 'price_pro';
    process.env.STRIPE_PRICE_ENTERPRISE = 'price_enterprise';

    expect(planForPriceId('price_pro')).toBe('pro');
    expect(planForPriceId('price_enterprise')).toBe('enterprise');
    expect(planForPriceId('price_unknown')).toBeNull();
    expect(isConfiguredPriceId('price_unknown')).toBe(false);
  });

  it('ignores blank env values', () => {
    process.env.STRIPE_PRICE_PRO = '   ';
    process.env.STRIPE_PRICE_ENTERPRISE = '';
    expect(getPlanPriceIds()).toEqual({ pro: undefined, enterprise: undefined });
  });
});
