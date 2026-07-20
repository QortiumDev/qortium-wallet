# Wallet: Background Payment Notifications

**Date:** 2026-07-19
**Status:** Approved

---

## Overview

Notify the user when they receive an incoming payment - QORT or any of the 8 foreign coins the wallet supports (BTC, LTC, DOGE, DGB, RVN, DASH, NMC, FIRO) - even when the wallet app is not open. Pirate Chain (ARRR) is excluded: it uses a separate lightwalletd-based wallet model, not the xpub/Electrum model the underlying watcher requires.

This relies entirely on infrastructure that already exists and needs no changes:

- **Qortium Core 1.5.0+** runs `ForeignPaymentNotificationService`, a persistent, session-scoped watcher backed by independent ElectrumX push connections per coin. Given an xpub, it detects incoming payments to any derived address and pushes a `FOREIGN_PAYMENT_RECEIVED` event over the node's notifications websocket. It only covers the 8 Bitcoiny/ElectrumX coins above - ARRR isn't and can't be part of this (separate `PirateWallet` implementation).
- **Qortium Home** already has the full generic bridge: `NOTIFICATION_ADD` / `NOTIFICATION_GET` / `NOTIFICATION_REMOVE` qdnRequest actions let any Q-App register rules (keyed by `notificationId`, `event`, `filters`), and a persistent websocket connection in the **Electron main process** (`electron/notification-watcher.ts`) delivers native OS notifications for matching events - independent of whether any app window is open or focused. It already handles Core-version gating (silently drops `FOREIGN_PAYMENT_RECEIVED` subscriptions against older Core nodes) and replay dedup across reconnects.
- **Qortium Home** already exposes `GET_USER_WALLET` (returns each foreign coin's xpub as `publicKey`/`publickey`), and the account's own QORT address is already available via `useAuth()`.

What's missing: nothing in the wallet Q-App has ever called `NOTIFICATION_ADD`. This spec adds that wiring, following the same pattern already used by `qortium-group-manager` (`useGroupNotifications`) and `qortium-publish-manager` (`useOwnPublishNotifications`).

---

## Rule building (pure logic)

New file `src/notifications/paymentNotificationRules.ts`, with no I/O - fully unit-testable:

```ts
export type ForeignWalletXpub = { coin: string; xpub: string };

export function buildPaymentNotificationRules(
  qortAddress: string | null,
  foreignWallets: ForeignWalletXpub[]
): NotificationRule[];
```

- If `qortAddress` is present, includes one rule:
  `{ notificationId: 'own-payment-received-qort', event: 'PAYMENT_RECEIVED', filters: { recipient: qortAddress }, title: 'QORT payment received' }`
- For each entry in `foreignWallets` (never containing ARRR - see below), includes:
  `{ notificationId: 'own-payment-received-<coin lowercased>', event: 'FOREIGN_PAYMENT_RECEIVED', filters: { coin, xpub } }`
  (no explicit `title`/`text` - Home's generic defaults for `FOREIGN_PAYMENT_RECEIVED` already render "Foreign payment received" / "Received `<amount>` `<COIN>`")

Also in this file:

- `findStaleNotificationIds(existingIds: string[], desiredIds: string[]): string[]` - returns IDs present in `existingIds` but not `desiredIds`, so they can be explicitly removed (`NOTIFICATION_ADD` upserts by ID; it does not delete IDs that are no longer sent).
- `paymentNotificationSignature(qortAddress: string | null, foreignWallets: ForeignWalletXpub[]): string` - a stable string built from the address and sorted `coin:xpub` pairs, used to skip redundant re-syncs.

## qdnRequest wrappers

New file `src/notifications/notificationsApi.ts`, mirroring the equivalent module in `qortium-group-manager`/`qortium-publish-manager`:

```ts
export type NotificationRule = {
  notificationId: string;
  event: string;
  filters: Record<string, boolean | number | string | string[]>;
  title?: string;
  text?: string;
  link?: string;
};

export async function supportsNotifications(): Promise<boolean>; // SHOW_ACTIONS includes NOTIFICATION_ADD
export async function getNotificationRules(): Promise<NotificationRule[]>; // NOTIFICATION_GET
export async function addNotificationRules(
  rules: NotificationRule[]
): Promise<void>; // NOTIFICATION_ADD, no-op if empty
export async function removeNotificationRules(
  notificationIds?: string[]
): Promise<void>; // NOTIFICATION_REMOVE
```

All four swallow errors the same way the sibling apps' equivalents do (best-effort background sync; no user-facing error surface).

## Sync hook

New file `src/hooks/usePaymentNotifications.ts`, mirroring `useGroupNotifications.ts`:

- Reads `walletReadyAtom` (true once the account-unlock check in `AppLayout` completes), `notificationsEnabledAtom`, `notificationsSupportedAtom` (both new, see below), the account's `address` from `useAuth()`, and `chains` from the existing `useSupportedChains()` hook.
- On mount, calls `supportsNotifications()` once to set `notificationsSupportedAtom`.
- Effect keyed on `[supported, enabled, walletReady, address, chains]`:
  - If not `supported`, not `enabled`, or not `walletReady`/no `address`: if a previous sync happened (tracked via a ref, not state), call `removeNotificationRules()` (no args - clears all of this app's rules, which are only ever these payment rules) and clear the ref.
  - Otherwise: derive the foreign-coin subset from `chains` by filtering `!chain.isNative && chain.key !== 'ARRR'`. The `key !== 'ARRR'` check is required explicitly: `KNOWN_CHAIN_MAP` (used by the live-discovery path in `useSupportedChains`) includes ARRR, so if Core reports Pirate Chain as `walletEnabled`, ARRR _does_ appear in the live `chains` array (it's only the offline `DEFAULT_CHAINS` fallback that omits it). For each remaining coin, call `qdnRequest({ action: 'GET_USER_WALLET', coin: chain.coinEnum })` in parallel via `Promise.all`, tolerating individual failures (locked wallet, node hiccup) by filtering out any coin whose request rejected or returned no `publicKey`.
  - Compute the signature; if unchanged from the last successful sync, skip.
  - Otherwise: build the desired rules, fetch existing rules via `getNotificationRules()`, diff stale IDs, call `removeNotificationRules(staleIds)` if any, then `addNotificationRules(rules)`. Update the signature ref only after both calls resolve.

Mounted once in `AppLayout.tsx`, alongside the existing `useMarketPricesPoller()`.

## Settings state

Two new atoms in `src/state/global/system.ts`:

```ts
export const notificationsSupportedAtom = atom<boolean>(false);
export const notificationsEnabledAtom = atomWithStorage<boolean>(
  'qw-notifications-enabled',
  false
);
```

Off by default - the user must discover and enable the bell, same as `qortium-group-manager`.

## UI

`TopBar.tsx` gets a bell `IconButton` next to `RatingControl`, rendered only when `notificationsSupported` is true:

- Uses `NotificationsActiveIcon` / `NotificationsOffIcon` (MUI), colored `c.accent` when enabled, `c.textSecondary` otherwise - same visual treatment as the existing buttons in this file (`buttonSx`).
- Tooltip: "Notify me of incoming payments" when enabled, "Notifications off" when disabled.
- `onClick` toggles `notificationsEnabledAtom`.

## Testing

New `src/notifications/paymentNotificationRules.test.ts` (mirrors `favoriteNotificationRules.test.ts`):

- `buildPaymentNotificationRules` produces the QORT rule only when an address is given, one rule per foreign wallet entry with the right `event`/`filters`/`notificationId`, and never emits anything for a coin not present in the input (this function trusts its caller's filtering - it has no ARRR-specific logic itself). ARRR exclusion is exercised where it actually happens: the `key !== 'ARRR'` filter in `usePaymentNotifications`, which is simple enough not to need its own unit test but is called out here so it isn't quietly dropped in a future refactor.
- `findStaleNotificationIds` diff behavior (empty existing, full overlap, partial overlap).
- `paymentNotificationSignature` is stable for the same input regardless of input array order, and changes when the address or any coin/xpub changes.

No changes needed to Core or Home - both already ship the required behavior.
