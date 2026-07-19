import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  notificationsEnabledAtom,
  notificationsSupportedAtom,
  paymentNotificationRegistrationErrorAtom,
  paymentNotificationRegistrationStatusAtom,
  walletReadyAtom,
} from '../state/global/system';
import { useSupportedChains } from './useSupportedChains';
import {
  supportsNotifications,
  removeNotificationRules,
} from '../notifications/notificationsApi';
import {
  paymentNotificationErrorMessage,
  registerPaymentNotifications,
} from '../notifications/paymentNotificationRegistration';

// Registers background payment notifications (own QORT address + foreign coin
// xpubs) with Home's notification bridge. ARRR is excluded here - the Core watcher
// behind FOREIGN_PAYMENT_RECEIVED only covers the Bitcoiny/ElectrumX coin set.
export function usePaymentNotifications() {
  const walletReady = useAtomValue(walletReadyAtom);
  const [enabled, setEnabled] = useAtom(notificationsEnabledAtom);
  const [supported, setSupported] = useAtom(notificationsSupportedAtom);
  const registrationError = useAtomValue(
    paymentNotificationRegistrationErrorAtom
  );
  const setRegistrationError = useSetAtom(
    paymentNotificationRegistrationErrorAtom
  );
  const setRegistrationStatus = useSetAtom(
    paymentNotificationRegistrationStatusAtom
  );
  const { chains } = useSupportedChains();
  const lastSyncedSignature = useRef<string | null>(null);
  const [accountRevision, setAccountRevision] = useState(0);

  useEffect(() => {
    supportsNotifications()
      .then(setSupported)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleAccountChange = (event: MessageEvent<unknown>) => {
      if (
        (event.source === window.parent || event.source === window) &&
        typeof event.data === 'object' &&
        event.data !== null &&
        (event.data as { action?: unknown }).action ===
          'SELECTED_ACCOUNT_CHANGED'
      ) {
        lastSyncedSignature.current = null;
        setAccountRevision((value) => value + 1);
      }
    };

    window.addEventListener('message', handleAccountChange);
    return () => window.removeEventListener('message', handleAccountChange);
  }, []);

  useEffect(() => {
    if (!supported || !walletReady) return;

    let cancelled = false;

    if (!enabled) {
      if (lastSyncedSignature.current !== null) {
        setRegistrationStatus('registering');
        removeNotificationRules()
          .then(() => {
            if (cancelled) return;
            lastSyncedSignature.current = null;
            setRegistrationStatus('idle');
          })
          .catch((error) => {
            if (cancelled) return;
            setRegistrationError(paymentNotificationErrorMessage(error));
            setRegistrationStatus('error');
          });
      } else if (!registrationError) {
        setRegistrationStatus('idle');
      }
      return () => {
        cancelled = true;
      };
    }

    const foreignCoins = chains
      .filter((chain) => !chain.isNative && chain.key !== 'ARRR')
      .map((chain) => chain.coinEnum);

    setRegistrationError(null);
    setRegistrationStatus('registering');
    registerPaymentNotifications(foreignCoins)
      .then(({ signature }) => {
        if (cancelled) return;
        lastSyncedSignature.current = signature;
        setRegistrationStatus('registered');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Payment notification registration failed:', error);
        setRegistrationError(paymentNotificationErrorMessage(error));
        setRegistrationStatus('error');
        setEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    accountRevision,
    chains,
    enabled,
    registrationError,
    setEnabled,
    setRegistrationError,
    setRegistrationStatus,
    supported,
    walletReady,
  ]);
}
