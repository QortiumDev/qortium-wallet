import { describe, it, expect } from 'vitest';
import {
  QORT_PAYMENT_NOTIFICATION_ID,
  buildPaymentNotificationRules,
  findStaleNotificationIds,
  foreignPaymentNotificationId,
  paymentNotificationSignature,
} from '../paymentNotificationRules';

describe('buildPaymentNotificationRules', () => {
  it('includes the QORT rule when an address is given', () => {
    const rules = buildPaymentNotificationRules('QAddress123', []);
    expect(rules).toEqual([
      {
        notificationId: QORT_PAYMENT_NOTIFICATION_ID,
        event: 'PAYMENT_RECEIVED',
        filters: { recipient: 'QAddress123' },
        title: 'QORT payment received',
      },
    ]);
  });

  it('omits the QORT rule when no address is given', () => {
    expect(buildPaymentNotificationRules(null, [])).toEqual([]);
  });

  it('builds one FOREIGN_PAYMENT_RECEIVED rule per foreign wallet', () => {
    const rules = buildPaymentNotificationRules(null, [
      { coin: 'BTC', xpub: 'xpub-btc' },
      { coin: 'LTC', xpub: 'xpub-ltc' },
    ]);
    expect(rules).toEqual([
      {
        notificationId: foreignPaymentNotificationId('BTC'),
        event: 'FOREIGN_PAYMENT_RECEIVED',
        filters: { coin: 'BTC', xpub: 'xpub-btc' },
      },
      {
        notificationId: foreignPaymentNotificationId('LTC'),
        event: 'FOREIGN_PAYMENT_RECEIVED',
        filters: { coin: 'LTC', xpub: 'xpub-ltc' },
      },
    ]);
  });

  it('never emits a rule for a coin that was not passed in (e.g. ARRR)', () => {
    const rules = buildPaymentNotificationRules('QAddress123', [
      { coin: 'BTC', xpub: 'xpub-btc' },
    ]);
    expect(rules.some((rule) => rule.filters.coin === 'ARRR')).toBe(false);
    expect(rules).toHaveLength(2);
  });
});

describe('findStaleNotificationIds', () => {
  it('returns ids present in existing but not in desired', () => {
    expect(findStaleNotificationIds(['a', 'b', 'c'], ['b', 'c'])).toEqual([
      'a',
    ]);
  });

  it('returns an empty array when nothing is stale', () => {
    expect(findStaleNotificationIds(['a'], ['a', 'b'])).toEqual([]);
  });

  it('returns an empty array when existing is empty', () => {
    expect(findStaleNotificationIds([], ['a'])).toEqual([]);
  });
});

describe('paymentNotificationSignature', () => {
  it('is stable regardless of foreign wallet ordering', () => {
    const a = { coin: 'BTC', xpub: 'xpub-btc' };
    const b = { coin: 'LTC', xpub: 'xpub-ltc' };
    expect(paymentNotificationSignature('Q1', [a, b])).toBe(
      paymentNotificationSignature('Q1', [b, a])
    );
  });

  it('changes when the QORT address changes', () => {
    expect(paymentNotificationSignature('Q1', [])).not.toBe(
      paymentNotificationSignature('Q2', [])
    );
  });

  it('changes when a coin xpub changes', () => {
    const before = [{ coin: 'BTC', xpub: 'xpub-old' }];
    const after = [{ coin: 'BTC', xpub: 'xpub-new' }];
    expect(paymentNotificationSignature('Q1', before)).not.toBe(
      paymentNotificationSignature('Q1', after)
    );
  });

  it('changes when a coin is added or removed', () => {
    const one = [{ coin: 'BTC', xpub: 'xpub-btc' }];
    const two = [
      { coin: 'BTC', xpub: 'xpub-btc' },
      { coin: 'LTC', xpub: 'xpub-ltc' },
    ];
    expect(paymentNotificationSignature('Q1', one)).not.toBe(
      paymentNotificationSignature('Q1', two)
    );
  });
});
