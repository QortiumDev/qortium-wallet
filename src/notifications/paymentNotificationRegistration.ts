import {
  addNotificationRules,
  getNotificationRules,
  removeNotificationRules,
  type NotificationRule,
} from './notificationsApi';
import {
  buildPaymentNotificationRules,
  findStaleNotificationIds,
  paymentNotificationSignature,
  type ForeignWalletXpub,
} from './paymentNotificationRules';

type Request = (options: QdnRequestOptions) => Promise<unknown>;

export type PaymentNotificationRegistrationDependencies = {
  request: Request;
  getRules: () => Promise<NotificationRule[]>;
  addRules: (rules: NotificationRule[]) => Promise<void>;
  removeRules: (notificationIds?: string[]) => Promise<void>;
};

const defaultDependencies: PaymentNotificationRegistrationDependencies = {
  // Resolve the injected bridge lazily so pure registration tests can import
  // this module outside a QDN frame.
  request: (options) => qdnRequest(options),
  getRules: getNotificationRules,
  addRules: addNotificationRules,
  removeRules: removeNotificationRules,
};

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function getSelectedAccountAddress(request: Request): Promise<string> {
  const account = (await request({ action: 'GET_SELECTED_ACCOUNT' })) as {
    address?: unknown;
  } | null;
  const address = readNonEmptyString(account?.address);

  if (!address) {
    throw new Error(
      'No selected QORT account is available for payment notifications.'
    );
  }

  return address;
}

async function getForeignWalletXpubs(
  coins: string[],
  request: Request
): Promise<ForeignWalletXpub[]> {
  return Promise.all(
    coins.map(async (coin) => {
      const wallet = (await request({
        action: 'GET_USER_WALLET',
        coin,
      })) as { publicKey?: unknown } | null;
      const xpub = readNonEmptyString(wallet?.publicKey);

      if (!xpub) {
        throw new Error(`No watch-only wallet key was returned for ${coin}.`);
      }

      return { coin, xpub };
    })
  );
}

export async function registerPaymentNotifications(
  foreignCoins: string[],
  dependencies: PaymentNotificationRegistrationDependencies = defaultDependencies
): Promise<{ ruleCount: number; signature: string }> {
  const qortAddress = await getSelectedAccountAddress(dependencies.request);
  const foreignWallets = await getForeignWalletXpubs(
    foreignCoins,
    dependencies.request
  );
  const rules = buildPaymentNotificationRules(qortAddress, foreignWallets);
  const existing = await dependencies.getRules();
  const staleIds = findStaleNotificationIds(
    existing.map((rule) => rule.notificationId),
    rules.map((rule) => rule.notificationId)
  );

  if (staleIds.length > 0) await dependencies.removeRules(staleIds);
  await dependencies.addRules(rules);

  return {
    ruleCount: rules.length,
    signature: paymentNotificationSignature(qortAddress, foreignWallets),
  };
}

export function paymentNotificationErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : '';
  return detail || 'Payment notifications could not be enabled.';
}
