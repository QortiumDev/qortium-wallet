import { describe, expect, it, vi } from 'vitest';
import {
  paymentNotificationErrorMessage,
  registerPaymentNotifications,
  type PaymentNotificationRegistrationDependencies,
} from '../paymentNotificationRegistration';

function dependencies(
  request: PaymentNotificationRegistrationDependencies['request']
): PaymentNotificationRegistrationDependencies {
  return {
    request,
    getRules: vi.fn().mockResolvedValue([]),
    addRules: vi.fn().mockResolvedValue(undefined),
    removeRules: vi.fn().mockResolvedValue(undefined),
  };
}

describe('registerPaymentNotifications', () => {
  it('uses GET_SELECTED_ACCOUNT and registers QORT plus foreign rules', async () => {
    const request = vi.fn(async (options: QdnRequestOptions) => {
      if (options.action === 'GET_SELECTED_ACCOUNT') {
        return { address: 'QSelectedAddress' };
      }
      if (options.action === 'GET_USER_WALLET') {
        return { publicKey: `xpub-${options.coin}` };
      }
      throw new Error(`Unexpected action: ${options.action}`);
    });
    const deps = dependencies(request);

    const result = await registerPaymentNotifications(['BTC', 'LTC'], deps);

    expect(request).toHaveBeenNthCalledWith(1, {
      action: 'GET_SELECTED_ACCOUNT',
    });
    expect(deps.addRules).toHaveBeenCalledWith([
      {
        notificationId: 'own-payment-received-qort',
        event: 'PAYMENT_RECEIVED',
        filters: { recipient: 'QSelectedAddress' },
        title: 'QORT payment received',
      },
      {
        notificationId: 'own-payment-received-btc',
        event: 'FOREIGN_PAYMENT_RECEIVED',
        filters: { coin: 'BTC', xpub: 'xpub-BTC' },
      },
      {
        notificationId: 'own-payment-received-ltc',
        event: 'FOREIGN_PAYMENT_RECEIVED',
        filters: { coin: 'LTC', xpub: 'xpub-LTC' },
      },
    ]);
    expect(result.ruleCount).toBe(3);
  });

  it('removes stale Wallet rules before adding the current set', async () => {
    const request = vi.fn(async (options: QdnRequestOptions) =>
      options.action === 'GET_SELECTED_ACCOUNT'
        ? { address: 'QSelectedAddress' }
        : { publicKey: 'xpub-BTC' }
    );
    const deps = dependencies(request);
    vi.mocked(deps.getRules).mockResolvedValue([
      {
        notificationId: 'own-payment-received-old',
        event: 'FOREIGN_PAYMENT_RECEIVED',
        filters: { coin: 'OLD', xpub: 'xpub-old' },
      },
    ]);

    await registerPaymentNotifications(['BTC'], deps);

    expect(deps.removeRules).toHaveBeenCalledWith(['own-payment-received-old']);
    expect(deps.addRules).toHaveBeenCalledOnce();
  });

  it('does not claim success without a selected account', async () => {
    const deps = dependencies(vi.fn().mockResolvedValue({}));

    await expect(registerPaymentNotifications(['BTC'], deps)).rejects.toThrow(
      'No selected QORT account'
    );
    expect(deps.addRules).not.toHaveBeenCalled();
  });

  it('does not silently omit a supported foreign wallet', async () => {
    const request = vi.fn(async (options: QdnRequestOptions) =>
      options.action === 'GET_SELECTED_ACCOUNT'
        ? { address: 'QSelectedAddress' }
        : {}
    );
    const deps = dependencies(request);

    await expect(registerPaymentNotifications(['BTC'], deps)).rejects.toThrow(
      'No watch-only wallet key was returned for BTC'
    );
    expect(deps.addRules).not.toHaveBeenCalled();
  });
});

describe('paymentNotificationErrorMessage', () => {
  it('uses a safe fallback for non-Error rejections', () => {
    expect(paymentNotificationErrorMessage(null)).toBe(
      'Payment notifications could not be enabled.'
    );
  });
});
