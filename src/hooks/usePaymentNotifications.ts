import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useAuth } from 'qapp-core';
import { notificationsEnabledAtom, notificationsSupportedAtom, walletReadyAtom } from '../state/global/system';
import { useSupportedChains } from './useSupportedChains';
import {
  supportsNotifications,
  getNotificationRules,
  addNotificationRules,
  removeNotificationRules,
} from '../notifications/notificationsApi';
import {
  buildPaymentNotificationRules,
  findStaleNotificationIds,
  paymentNotificationSignature,
  type ForeignWalletXpub,
} from '../notifications/paymentNotificationRules';

async function fetchForeignWalletXpubs(coins: string[]): Promise<ForeignWalletXpub[]> {
  const results = await Promise.all(
    coins.map(async (coin): Promise<ForeignWalletXpub | null> => {
      try {
        const res = (await qdnRequest({ action: 'GET_USER_WALLET', coin })) as { publicKey?: string } | null;
        return res?.publicKey ? { coin, xpub: res.publicKey } : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((wallet): wallet is ForeignWalletXpub => wallet !== null);
}

async function syncPaymentNotificationRules(qortAddress: string | null, foreignWallets: ForeignWalletXpub[]) {
  const rules = buildPaymentNotificationRules(qortAddress, foreignWallets);
  const existing = await getNotificationRules();
  const existingIds = existing.map((rule) => rule.notificationId);
  const desiredIds = rules.map((rule) => rule.notificationId);
  const staleIds = findStaleNotificationIds(existingIds, desiredIds);

  if (staleIds.length > 0) await removeNotificationRules(staleIds);
  await addNotificationRules(rules);
}

// Registers background payment notifications (own QORT address + foreign coin
// xpubs) with Home's notification bridge. ARRR is excluded here - the Core watcher
// behind FOREIGN_PAYMENT_RECEIVED only covers the Bitcoiny/ElectrumX coin set.
export function usePaymentNotifications() {
  const { address } = useAuth();
  const walletReady = useAtomValue(walletReadyAtom);
  const enabled = useAtomValue(notificationsEnabledAtom);
  const [supported, setSupported] = useAtom(notificationsSupportedAtom);
  const { chains } = useSupportedChains();
  const lastSyncedSignature = useRef<string | null>(null);

  useEffect(() => {
    supportsNotifications().then(setSupported).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!supported) return;

    if (!enabled || !walletReady || !address) {
      if (lastSyncedSignature.current !== null) {
        removeNotificationRules().catch(() => {});
        lastSyncedSignature.current = null;
      }
      return;
    }

    const qortAddress = address;
    const foreignCoins = chains
      .filter((chain) => !chain.isNative && chain.key !== 'ARRR')
      .map((chain) => chain.coinEnum);

    let cancelled = false;
    fetchForeignWalletXpubs(foreignCoins)
      .then((foreignWallets) => {
        if (cancelled) return;
        const signature = paymentNotificationSignature(qortAddress, foreignWallets);
        if (signature === lastSyncedSignature.current) return;
        return syncPaymentNotificationRules(qortAddress, foreignWallets).then(() => {
          lastSyncedSignature.current = signature;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supported, enabled, walletReady, address, chains]);
}
