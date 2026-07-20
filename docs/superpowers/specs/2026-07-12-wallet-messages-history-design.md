# Wallet: Payment Messages, Unified History, and Contact Sharing

**Date:** 2026-07-12
**Status:** Approved

---

## Overview

Three related features for the Qortium wallet app:

1. **Payment Messages** - attach an E2E encrypted message to any payment (QORT or foreign chain), stored on QDN and viewable when either party views the transaction in Qortium wallet
2. **Shareable Contact Link** - publish your QORT name and all wallet addresses as a QDN contact card; share a deep link so others can import you into their address book in one tap
3. **Unified Transaction History** - a single `/history` view that aggregates and chronologically sorts transactions across all coins

---

## Feature 1: Payment Messages

### Address Book changes

`AddressBookEntry` in `src/utils/Types.tsx` gains one optional field:

```ts
qortAddress?: string; // QORT address or registered name for the contact
```

The Add/Edit address dialog gets a new optional "QORT Address or Name" input below the existing fields, shown for all coin types. No validation beyond non-empty if provided; name resolution happens at send time.

### Send Dialog changes

Two new optional inputs appear below the recipient field in `CoinDetail`'s send dialog:

1. **Message field** - plain text, max 280 chars, label: "Payment message (optional)". When empty, the send flow is entirely unchanged.
2. **Recipient QORT field** - label: "Recipient's QORT address or name". Visible only when the message field has content. Pre-populated from `addressBook[recipient].qortAddress` if the recipient is in the address book with a QORT address saved. Accepts a QORT address (`Q...`) or a registered name. Resolves to an address on blur via the appropriate QDN request; shows a small check or error indicator on resolution result.

`canConfirmSend` is unaffected - the QORT field only blocks send if the message field is non-empty AND the QORT field has content that failed to resolve. If the message field is empty the QORT field is ignored entirely.

### Send flow (post-success)

After a successful payment, if a message was entered and a recipient QORT address was resolved, the following runs async (fire-and-forget, silent on failure - does not affect the success/error state shown to the user):

1. Check that the sender has a registered QORT name (required to publish QDN resources). If they do not, the message is silently dropped - no error is shown since the payment itself succeeded. A follow-up improvement could surface a one-time notice explaining this requirement.
2. Fetch the recipient's public key via their QORT address
3. Build payload:
   ```json
   {
     "message": "...",
     "txHash": "...",
     "coin": "LTC",
     "amount": "0.5",
     "timestamp": 1234567890
   }
   ```
4. Call `ENCRYPT_DATA` with the recipient's public key to encrypt the payload
5. Publish encrypted blob as a QDN ARBITRARY resource:
   - identifier: `wallet-payment-msg-{txHash}`
   - service: `ARBITRARY`
   - published under the sender's registered name
6. Cache the plaintext message in localStorage keyed by `payment-msg-{txHash}` so the sender can read their own sent messages instantly without re-fetching

### Viewing messages in transaction detail

In the expanded transaction detail row, a **Message** field appears at the top of the detail section under the following conditions:

| Transaction type       | Condition                                        | Behavior                                                                               |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Sent (any coin)        | `localStorage` has `payment-msg-{txHash}`        | Show immediately, no fetch needed                                                      |
| Received QORT          | `creatorAddress` is in the tx data               | Resolve sender name from address, fetch QDN resource, decrypt, show with loading state |
| Received foreign chain | Sender is in address book with `qortAddress` set | Same fetch/decrypt flow as received QORT                                               |
| Received foreign chain | No sender QORT address known                     | Message field omitted entirely, no indication                                          |

If the QDN fetch returns no resource or decryption fails, the Message field is silently omitted.

---

## Feature 2: Shareable Contact Link

### Publishing

A **Share Contact** button on the CoinGrid home screen. On tap:

1. Fetch the user's QORT name and all wallet addresses (all enabled coins)
2. Publish or update a QDN ARBITRARY resource:
   - identifier: `wallet-contact-card`
   - service: `ARBITRARY`
   - content:
     ```json
     {
       "qortName": "YourName",
       "qortAddress": "Q...",
       "addresses": { "LTC": "ltc1...", "BTC": "bc1...", "DOGE": "D..." },
       "updatedAt": 1234567890
     }
     ```
3. Copy a shareable deep link to clipboard. The exact format depends on how Qortium routes app links (to be confirmed during implementation - likely a hash route string the recipient pastes or taps, e.g. `#/contact/YourName`)
4. Show a brief "Link copied" toast

The card is re-published every time Share Contact is tapped, keeping it current if addresses have changed. No separate "update" flow.

### New route: `/contact/:qortName`

Handles incoming contact links. On load:

1. Fetch the `wallet-contact-card` QDN ARBITRARY resource for the given name
2. Show a preview screen: QORT name, QORT address, and a list of all their coin addresses with coin icons
3. **Add to Address Book** button - imports each address into the relevant coin's address book:
   - Entry name: their QORT name
   - Address: the coin-specific address from the card
   - `qortAddress`: their QORT address (enables payment messages automatically)
   - Entries where the address already exists in that coin's address book are skipped silently
4. Back button returns to home

---

## Feature 3: Unified Transaction History

### New route: `/history`

Accessible from a **History** button on the CoinGrid home screen. Back arrow in the sub-header returns to the grid.

### `useUnifiedHistory` hook

New hook at `src/hooks/useUnifiedHistory.ts`. Fires parallel fetch requests for all chains currently displayed in the grid using the same logic as `CoinDetail`:

- QORT: `FETCH_NODE_API /transactions/search`, last 20 txs
- Foreign chains: `GET_USER_WALLET_TRANSACTIONS`, last 20 txs
- ARRR: skipped - a static notice entry is injected instead

Each chain's results are added to the merged list as they arrive (no waiting for all chains). The list is re-sorted descending by timestamp after each batch is added. Unconfirmed rows (no timestamp) sort to the top.

Exposes:

```ts
interface UnifiedTxRow extends TxRow {
  chain: ChainConfig;
}

interface UseUnifiedHistoryResult {
  rows: UnifiedTxRow[];
  loadingChains: string[]; // ticker names still in-flight
  errorChains: string[]; // ticker names that failed
}
```

### Layout

Mirrors `CoinDetail`'s transaction list with two additions per row:

- **Coin badge**: coin icon + ticker shown left of the existing green/red dot
- **Envelope icon**: shown on the right side of the row if `localStorage` has a cached sent message for that tx hash; indicates a message is attached

A status bar below the page header shows "Loaded N of M coins" while fetching, disappearing once all chains have resolved. Error chains appear as a muted inline warning: "BTC, DOGE failed to load."

### ARRR notice

A single non-interactive muted info row in place of ARRR transactions: "ARRR requires initialization - visit the ARRR page to sync first."

### Filters

Three toggle buttons above the list: **All / Received / Sent**. Client-side filter on already-loaded rows, no re-fetch.

### Expanded row detail

Reuses the same expanded detail render as `CoinDetail` (hash, from/to, fee, date, message). The row's `chain` is passed in so amounts and decimal places are correct. No duplicated logic.

---

## New files

| File                                       | Purpose                                       |
| ------------------------------------------ | --------------------------------------------- |
| `src/hooks/useUnifiedHistory.ts`           | Unified history data hook                     |
| `src/components/wallet/UnifiedHistory.tsx` | `/history` route component                    |
| `src/components/wallet/ContactCard.tsx`    | `/contact/:qortName` route component          |
| `src/utils/paymentMessages.ts`             | Encrypt/publish/fetch/decrypt message helpers |

## Modified files

| File                                               | Change                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/utils/Types.tsx`                              | Add `qortAddress?: string` to `AddressBookEntry`                                        |
| `src/components/wallet/CoinDetail.tsx`             | Message field + QORT recipient field in send dialog; message display in expanded tx row |
| `src/components/wallet/CoinGrid.tsx`               | Add Share Contact and History buttons                                                   |
| `src/components/AddressBook/AddressBookDialog.tsx` | Add QORT address input                                                                  |
| `src/routes/Routes.tsx`                            | Add `/history` and `/contact/:qortName` routes                                          |
| `src/i18n/locales/en/core.json`                    | New i18n keys for all new UI strings                                                    |
