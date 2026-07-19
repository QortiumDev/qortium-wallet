import type { NotificationRule } from './notificationsApi';

export const QORT_PAYMENT_NOTIFICATION_ID = 'own-payment-received-qort';

export function foreignPaymentNotificationId(coin: string): string {
  return `own-payment-received-${coin.toLowerCase()}`;
}

export type ForeignWalletXpub = { coin: string; xpub: string };

// Builds the desired notification rule set for the account: one PAYMENT_RECEIVED
// rule for the user's own QORT address, plus one FOREIGN_PAYMENT_RECEIVED rule per
// foreign wallet passed in. Callers are responsible for excluding coins that
// shouldn't be watched (e.g. ARRR, which the underlying Core watcher can't cover).
export function buildPaymentNotificationRules(
  qortAddress: string | null,
  foreignWallets: ForeignWalletXpub[],
): NotificationRule[] {
  const rules: NotificationRule[] = [];

  if (qortAddress) {
    rules.push({
      notificationId: QORT_PAYMENT_NOTIFICATION_ID,
      event: 'PAYMENT_RECEIVED',
      filters: { recipient: qortAddress },
      title: 'QORT payment received',
    });
  }

  for (const wallet of foreignWallets) {
    rules.push({
      notificationId: foreignPaymentNotificationId(wallet.coin),
      event: 'FOREIGN_PAYMENT_RECEIVED',
      filters: { coin: wallet.coin, xpub: wallet.xpub },
    });
  }

  return rules;
}

export function findStaleNotificationIds(existingIds: string[], desiredIds: string[]): string[] {
  const desired = new Set(desiredIds);
  return existingIds.filter((id) => !desired.has(id));
}

// Stable regardless of foreignWallets ordering, so unrelated re-renders (or a node
// returning its coin list in a different order) don't trigger a redundant re-sync.
export function paymentNotificationSignature(
  qortAddress: string | null,
  foreignWallets: ForeignWalletXpub[],
): string {
  const sortedWallets = [...foreignWallets]
    .map((wallet) => `${wallet.coin}:${wallet.xpub}`)
    .sort()
    .join(',');
  return `${qortAddress ?? ''}|${sortedWallets}`;
}
