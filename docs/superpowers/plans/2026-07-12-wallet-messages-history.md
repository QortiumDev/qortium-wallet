# Wallet: Payment Messages, Contact Sharing, and Unified History

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add E2E-encrypted payment messages, a shareable QDN contact card, and a unified all-coins transaction history view to the Qortium wallet Q-App.

**Architecture:** Payment messages are stored as encrypted ARBITRARY QDN resources keyed by tx hash, published under the sender's registered QORT name; recipients look them up by sender name + tx hash. The unified history fires parallel per-chain fetches and merges results into a single timestamp-sorted list. Contact cards are published as ARBITRARY QDN resources under identifier `wallet-contact-card` and imported via a new `/contact/:qortName` route.

**Tech Stack:** TypeScript, React 19, MUI v7, Jotai, react-i18next, Vitest + Testing Library. All chain/QDN operations go through the global `qdnRequest` bridge (injected at runtime by Qortium Home — available as a global, no import needed). Tests run with `npm test -- --run`.

---

## Spec reference

`docs/superpowers/specs/2026-07-12-wallet-messages-history-design.md`

---

## File Map

| Action | Path                                               | Responsibility                                                          |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Create | `src/utils/paymentMessages.ts`                     | QDN encrypt/publish/fetch/decrypt + localStorage cache                  |
| Create | `src/utils/__tests__/paymentMessages.test.ts`      | Unit tests for pure functions                                           |
| Create | `src/components/wallet/TransactionRow.tsx`         | Shared expandable tx row extracted from CoinDetail                      |
| Create | `src/hooks/useUnifiedHistory.ts`                   | Parallel multi-chain fetch hook                                         |
| Create | `src/hooks/__tests__/useUnifiedHistory.test.ts`    | Hook unit tests                                                         |
| Create | `src/components/wallet/UnifiedHistory.tsx`         | `/history` page component                                               |
| Create | `src/components/wallet/ContactCard.tsx`            | `/contact/:qortName` page component                                     |
| Modify | `src/utils/Types.tsx`                              | Add `qortAddress?: string` to `AddressBookEntry`                        |
| Modify | `src/components/AddressBook/AddressFormDialog.tsx` | Add QORT address field                                                  |
| Modify | `src/components/AddressBook/AddressBookDialog.tsx` | Pass `qortAddress` through `handleSave`                                 |
| Modify | `src/components/wallet/CoinDetail.tsx`             | Use `TransactionRow`, add send dialog message fields, post-send publish |
| Modify | `src/components/wallet/CoinGrid.tsx`               | Add History and Share Contact buttons                                   |
| Modify | `src/routes/Routes.tsx`                            | Add `/history` and `/contact/:qortName`                                 |
| Modify | `src/i18n/locales/en/core.json`                    | New i18n keys                                                           |

---

## Task 1: Add `qortAddress` to AddressBookEntry and form

**Files:**

- Modify: `src/utils/Types.tsx`
- Modify: `src/components/AddressBook/AddressFormDialog.tsx`
- Modify: `src/components/AddressBook/AddressBookDialog.tsx`
- Modify: `src/i18n/locales/en/core.json`

- [ ] **Step 1: Add optional `qortAddress` field to AddressBookEntry**

In `src/utils/Types.tsx`, after the `note` field:

```ts
export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  note: string;
  qortAddress?: string; // QORT address or registered name; enables payment messages
  coinType: Coin;
  createdAt: number;
  updatedAt?: number;
}
```

- [ ] **Step 2: Add i18n key for QORT address field**

In `src/i18n/locales/en/core.json`, add after `"address_book_note"`:

```json
"address_book_qort_address": "QORT address or name (optional)",
```

- [ ] **Step 3: Add `qortAddress` state and TextField to AddressFormDialog**

In `src/components/AddressBook/AddressFormDialog.tsx`:

After `const [note, setNote] = useState(EMPTY_STRING);`, add:

```ts
const [qortAddress, setQortAddress] = useState(EMPTY_STRING);
```

In the `useEffect` that initialises the form when `open` changes, inside the `if (entry)` block add:

```ts
setQortAddress(entry.qortAddress ?? EMPTY_STRING);
```

And in the `else` block add:

```ts
setQortAddress(EMPTY_STRING);
```

In `handleSave`, change the `onSave` call to:

```ts
onSave({
  name: name.trim(),
  address: address.trim(),
  note: note.trim(),
  qortAddress: qortAddress.trim() || undefined,
  coinType,
});
```

Add a new TextField after the Note field, inside the column `Box`:

```tsx
{
  /* QORT Address Field */
}
<TextField
  fullWidth
  label={t('core:address_book_qort_address', {
    postProcess: 'capitalizeFirstChar',
  })}
  value={qortAddress}
  onChange={(e) => setQortAddress(e.target.value.trim())}
/>;
```

- [ ] **Step 4: Pass `qortAddress` through AddressBookDialog.handleSave**

In `src/components/AddressBook/AddressBookDialog.tsx`, the `handleSave` function calls `updateAddress` with only `{ name, address, note }`. Add `qortAddress`:

```ts
if (editingEntry) {
  updateAddress(editingEntry.id, coinType, {
    name: entry.name,
    address: entry.address,
    note: entry.note,
    qortAddress: entry.qortAddress,
  });
} else {
  addAddress(entry);
}
```

- [ ] **Step 5: Run tests**

```bash
cd projects/qortium-wallet/work && npm test -- --run
```

Expected: all existing tests pass (no new tests needed here — the type change is covered by compiler).

- [ ] **Step 6: Commit**

```bash
git add src/utils/Types.tsx src/components/AddressBook/AddressFormDialog.tsx src/components/AddressBook/AddressBookDialog.tsx src/i18n/locales/en/core.json
git commit -m "feat(address-book): add qortAddress field for payment message support"
```

---

## Task 2: paymentMessages.ts utilities

**Files:**

- Create: `src/utils/paymentMessages.ts`
- Create: `src/utils/__tests__/paymentMessages.test.ts`

> **QDN format note:** `ENCRYPT_DATA`, `DECRYPT_DATA`, `PUBLISH_QDN_RESOURCE`, and `FETCH_QDN_RESOURCE` shapes below are based on standard Qortal patterns. Verify the exact request shapes against the Qortium qdnrequest bridge reference before shipping. In particular confirm: (1) `ENCRYPT_DATA` accepts `data64` + `publicKeys[]`; (2) `FETCH_QDN_RESOURCE` accepts `encoding: 'base64'`; (3) `DECRYPT_DATA` accepts `encryptedData`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/paymentMessages.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getMessageQdnIdentifier,
  cacheMessage,
  getCachedMessage,
  buildMessagePayload,
} from '../paymentMessages';

describe('paymentMessages', () => {
  beforeEach(() => localStorage.clear());

  it('builds a deterministic QDN identifier from a tx hash', () => {
    expect(getMessageQdnIdentifier('abc123')).toBe('wallet-payment-msg-abc123');
  });

  it('caches and retrieves a message by tx hash', () => {
    cacheMessage('abc123', 'thanks for lunch');
    expect(getCachedMessage('abc123')).toBe('thanks for lunch');
  });

  it('returns null for an uncached tx hash', () => {
    expect(getCachedMessage('missing')).toBeNull();
  });

  it('buildMessagePayload includes all required fields with a numeric timestamp', () => {
    const p = buildMessagePayload('thanks', 'sig123', 'LTC', '0.5');
    expect(p).toMatchObject({
      message: 'thanks',
      txHash: 'sig123',
      coin: 'LTC',
      amount: '0.5',
    });
    expect(typeof p.timestamp).toBe('number');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/utils/__tests__/paymentMessages.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/paymentMessages.ts`**

```ts
const CACHE_PREFIX = 'payment-msg-';

export interface MessagePayload {
  message: string;
  txHash: string;
  coin: string;
  amount: string;
  timestamp: number;
}

export function getMessageQdnIdentifier(txHash: string): string {
  return `wallet-payment-msg-${txHash}`;
}

export function cacheMessage(txHash: string, message: string): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${txHash}`, message);
  } catch {
    /* quota exceeded - silently drop */
  }
}

export function getCachedMessage(txHash: string): string | null {
  return localStorage.getItem(`${CACHE_PREFIX}${txHash}`);
}

export function buildMessagePayload(
  message: string,
  txHash: string,
  coin: string,
  amount: string
): MessagePayload {
  return { message, txHash, coin, amount, timestamp: Date.now() };
}

/** Resolves a QORT name to its owner address. Returns null on failure. */
export async function resolveQortName(name: string): Promise<string | null> {
  try {
    const res = await qdnRequest({ action: 'GET_NAME_DATA', name } as any);
    return res?.owner ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches the public key for a QORT address.
 * The account must have made at least one on-chain transaction for the key to be available.
 */
export async function fetchPublicKey(
  qortAddress: string
): Promise<string | null> {
  try {
    const res = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/addresses/${qortAddress}`,
    } as any);
    return res?.publicKey ?? null;
  } catch {
    return null;
  }
}

/** Returns the first registered QORT name for an address, or null. */
export async function fetchNameForAddress(
  qortAddress: string
): Promise<string | null> {
  try {
    const res = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/names/address/${qortAddress}`,
    } as any);
    const names = Array.isArray(res) ? res : [];
    return names[0]?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Encrypts payload for both recipient and sender (so sender can re-read),
 * then publishes as a QDN ARBITRARY resource under the sender's name.
 * Throws on failure — caller is responsible for fire-and-forget wrapping.
 */
export async function publishPaymentMessage(
  payload: MessagePayload,
  senderPublicKey: string,
  recipientPublicKey: string
): Promise<void> {
  const data64 = btoa(JSON.stringify(payload));

  // Verify: ENCRYPT_DATA accepts { data64, publicKeys: string[] }
  const encrypted: string = await qdnRequest({
    action: 'ENCRYPT_DATA',
    data64,
    publicKeys: [recipientPublicKey, senderPublicKey],
  } as any);

  // Verify: PUBLISH_QDN_RESOURCE accepts { service, identifier, data64 }
  await qdnRequest({
    action: 'PUBLISH_QDN_RESOURCE',
    service: 'ARBITRARY',
    identifier: getMessageQdnIdentifier(payload.txHash),
    data64: encrypted,
  } as any);
}

/**
 * Fetches and decrypts a payment message published by senderName.
 * Returns the message string, or null if not found or decryption fails.
 */
export async function fetchPaymentMessage(
  senderName: string,
  txHash: string
): Promise<string | null> {
  try {
    // Verify: FETCH_QDN_RESOURCE accepts { service, name, identifier, encoding }
    const resourceData: string = await qdnRequest({
      action: 'FETCH_QDN_RESOURCE',
      service: 'ARBITRARY',
      name: senderName,
      identifier: getMessageQdnIdentifier(txHash),
      encoding: 'base64',
    } as any);

    if (!resourceData) return null;

    // Verify: DECRYPT_DATA accepts { encryptedData: string } and returns base64 plaintext
    const decrypted: string = await qdnRequest({
      action: 'DECRYPT_DATA',
      encryptedData: resourceData,
    } as any);

    const parsed: MessagePayload = JSON.parse(atob(decrypted));
    return parsed.message ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/utils/__tests__/paymentMessages.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/paymentMessages.ts src/utils/__tests__/paymentMessages.test.ts
git commit -m "feat(payment-messages): add QDN encrypt/publish/fetch utilities and local cache"
```

---

## Task 3: Extract TransactionRow shared component + add message display

Extracts the tx row JSX from `CoinDetail.tsx` into `TransactionRow.tsx` so both CoinDetail and UnifiedHistory (Task 6) can use it without duplication. Message display is added here.

**Files:**

- Create: `src/components/wallet/TransactionRow.tsx`
- Modify: `src/components/wallet/CoinDetail.tsx`

- [ ] **Step 1: Create `src/components/wallet/TransactionRow.tsx`**

The `TxRow` interface currently lives inline in CoinDetail. Move it here along with all the rendering logic from the `transactions.map(...)` block (lines ~1079-1356 in CoinDetail).

```tsx
import { Box, IconButton, CircularProgress } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useAtomValue } from 'jotai';
import { uiStyleAtom } from '../../state/global/system';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useCoinImageUrl } from '../../hooks/useCoinImageUrl';
import type { ChainConfig } from '../../config/chains';
import { epochToAgo } from '../../common/functions';
import { getCachedMessage } from '../../utils/paymentMessages';

export interface TxRow {
  txHash?: string;
  totalAmount?: number;
  feeAmount?: number;
  timestamp?: number;
  sender?: string;
  recipient?: string;
  inputs?: { address: string; amount: number; addressInWallet?: boolean }[];
  outputs?: { address: string; amount: number; addressInWallet?: boolean }[];
}

interface TransactionRowProps {
  row: TxRow;
  index: number;
  isLastRow: boolean;
  chain: ChainConfig;
  userAddress: string;
  expanded: boolean;
  onToggleExpand: () => void;
  copiedHash: number | null;
  onCopyHash: (index: number, hash: string) => void;
  /** Fetched QDN message for received txs; undefined = not yet attempted, null = not found */
  qdnMessage?: string | null;
  qdnMessageLoading?: boolean;
  /** When true, renders a coin icon + ticker badge before the dot (used in UnifiedHistory) */
  showCoinBadge?: boolean;
}

export function TransactionRow({
  row,
  index,
  isLastRow,
  chain,
  userAddress,
  expanded,
  onToggleExpand,
  copiedHash,
  onCopyHash,
  qdnMessage,
  qdnMessageLoading,
  showCoinBadge,
}: TransactionRowProps) {
  const c = useColors();
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const coinImageUrl = useCoinImageUrl(chain.ticker);
  const divisor = Math.pow(10, chain.decimalPlaces);
  const isPositive = (row.totalAmount ?? 0) > 0;

  const txAmount = () =>
    (Number(row.totalAmount ?? 0) / divisor).toFixed(chain.decimalPlaces);

  const txFee = () =>
    (Number(row.feeAmount ?? 0) / divisor).toFixed(chain.decimalPlaces);

  const fmtAddr = (addr?: string) => {
    if (!addr) return '—';
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
  };

  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v : undefined;

  const counterparty = (): string | undefined => {
    if (isPositive) {
      if (str(row.sender)) return str(row.sender);
      return str(row.inputs?.find((i) => !i.addressInWallet)?.address);
    } else {
      if (str(row.recipient)) return str(row.recipient);
      return str(row.outputs?.find((o) => !o.addressInWallet)?.address);
    }
  };

  const cp = counterparty();
  const cachedMsg = row.txHash ? getCachedMessage(row.txHash) : null;
  const displayMessage = cachedMsg ?? qdnMessage;
  const hasMessage = cachedMsg !== null;

  return (
    <Box
      sx={{
        borderBottom: !isLastRow
          ? `1px solid ${isClassic ? c.border : c.borderLight}`
          : 'none',
      }}
    >
      {/* Row header */}
      <Box
        onClick={onToggleExpand}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          py: 1.75,
          gap: 2,
          cursor: 'pointer',
          bgcolor: expanded
            ? isClassic
              ? c.controlSelected
              : c.borderLight
            : 'transparent',
          '&:hover': { bgcolor: isClassic ? c.controlHover : c.borderLight },
          transition: 'background-color 0.12s ease',
        }}
      >
        {showCoinBadge && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            {coinImageUrl && (
              <Box
                component="img"
                src={coinImageUrl}
                alt={chain.ticker}
                sx={{ height: 16, width: 16, objectFit: 'contain' }}
              />
            )}
            <Box
              sx={{
                fontSize: '0.6rem',
                fontWeight: tokens.typography.weightBold,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: c.textSecondary,
                minWidth: 28,
              }}
            >
              {chain.ticker}
            </Box>
          </Box>
        )}

        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: isPositive ? c.success : c.error,
          }}
        />

        <Box
          sx={{
            fontWeight: tokens.typography.weightBold,
            fontSize: '0.9rem',
            color: isPositive ? c.success : c.error,
            minWidth: { xs: 90, sm: 140 },
            flexShrink: 0,
          }}
        >
          {isPositive ? '+' : ''}
          {txAmount()} {chain.ticker}
        </Box>

        <Box
          sx={{
            flex: 1,
            fontFamily: c.monoFontFamily,
            fontSize: '0.72rem',
            color: c.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cp
            ? isPositive
              ? `from ${fmtAddr(cp)}`
              : `to ${fmtAddr(cp)}`
            : '—'}
        </Box>

        {hasMessage && (
          <MailOutlineIcon
            sx={{ fontSize: 14, color: c.textSecondary, flexShrink: 0 }}
          />
        )}

        <Box
          sx={{
            fontSize: '0.7rem',
            color: c.textSecondary,
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {row.timestamp ? epochToAgo(row.timestamp) : 'Unconfirmed'}
        </Box>
      </Box>

      {/* Expanded detail */}
      {expanded && (
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: isClassic ? c.surfaceAlt : c.bg,
            borderTop: `1px solid ${isClassic ? c.border : c.borderLight}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          {/* Message row - shown when there is a message or it's loading */}
          {(displayMessage != null || qdnMessageLoading) && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: tokens.typography.weightBold,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: c.textSecondary,
                  minWidth: 44,
                  flexShrink: 0,
                  pt: 0.25,
                }}
              >
                Message
              </Box>
              {qdnMessageLoading ? (
                <CircularProgress size={12} sx={{ color: c.accent, mt: 0.5 }} />
              ) : (
                <Box
                  sx={{
                    fontSize: '0.78rem',
                    color: c.textPrimary,
                    flex: 1,
                    wordBreak: 'break-word',
                  }}
                >
                  {displayMessage}
                </Box>
              )}
            </Box>
          )}

          {/* Standard detail rows */}
          {[
            {
              label: 'Hash',
              value: str(row.txHash),
              mono: true,
              copyIdx: index,
            },
            { label: isPositive ? 'From' : 'To', value: cp, mono: true },
            {
              label: isPositive ? 'To' : 'From',
              value: isPositive
                ? userAddress
                : (str(row.sender) ?? userAddress),
              mono: true,
            },
            {
              label: 'Fee',
              value:
                row.feeAmount != null
                  ? `${txFee()} ${chain.ticker}`
                  : undefined,
            },
            {
              label: 'Date',
              value: row.timestamp
                ? new Date(row.timestamp).toLocaleString()
                : undefined,
            },
          ].map(({ label, value, mono, copyIdx }) =>
            value ? (
              <Box
                key={label}
                sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
              >
                <Box
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: tokens.typography.weightBold,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: c.textSecondary,
                    minWidth: 44,
                    flexShrink: 0,
                  }}
                >
                  {label}
                </Box>
                <Box
                  sx={{
                    fontFamily: mono ? c.monoFontFamily : undefined,
                    fontSize: '0.75rem',
                    color: c.textPrimary,
                    wordBreak: 'break-all',
                    flex: 1,
                  }}
                >
                  {String(value)}
                </Box>
                {copyIdx != null && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyHash(copyIdx, value!);
                    }}
                    sx={{ flexShrink: 0, p: 0.5 }}
                  >
                    {copiedHash === copyIdx ? (
                      <CheckIcon sx={{ fontSize: 14, color: c.success }} />
                    ) : (
                      <ContentCopyIcon
                        sx={{ fontSize: 14, color: c.textSecondary }}
                      />
                    )}
                  </IconButton>
                )}
              </Box>
            ) : null
          )}

          {/* Inputs / outputs */}
          {row.inputs?.length || row.outputs?.length ? (
            <Box sx={{ mt: 0.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {row.inputs?.length ? (
                <Box>
                  <Box
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: tokens.typography.weightBold,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: c.textSecondary,
                      mb: 0.5,
                    }}
                  >
                    Inputs
                  </Box>
                  {row.inputs.map((inp, j) => (
                    <Box
                      key={j}
                      sx={{
                        fontFamily: c.monoFontFamily,
                        fontSize: '0.7rem',
                        color: inp.addressInWallet ? c.accent : c.textSecondary,
                      }}
                    >
                      {fmtAddr(inp.address)} ·{' '}
                      {(inp.amount / divisor).toFixed(chain.decimalPlaces)}
                    </Box>
                  ))}
                </Box>
              ) : null}
              {row.outputs?.length ? (
                <Box>
                  <Box
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: tokens.typography.weightBold,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: c.textSecondary,
                      mb: 0.5,
                    }}
                  >
                    Outputs
                  </Box>
                  {row.outputs.map((out, j) => (
                    <Box
                      key={j}
                      sx={{
                        fontFamily: c.monoFontFamily,
                        fontSize: '0.7rem',
                        color: out.addressInWallet ? c.accent : c.textSecondary,
                      }}
                    >
                      {fmtAddr(out.address)} ·{' '}
                      {(out.amount / divisor).toFixed(chain.decimalPlaces)}
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Update CoinDetail.tsx to use TransactionRow**

In `src/components/wallet/CoinDetail.tsx`:

a) Remove the inline `interface TxRow { ... }` definition (lines 64-73) — it now lives in TransactionRow.tsx.

b) Add imports:

```ts
import { TransactionRow, type TxRow } from './TransactionRow';
import {
  getCachedMessage,
  fetchPaymentMessage,
  fetchNameForAddress,
} from '../../utils/paymentMessages';
```

c) Add new state for fetched QDN messages and loading flags (after the existing `const [copiedHash, ...]` state):

```ts
const [qdnMessages, setQdnMessages] = useState<Record<string, string | null>>(
  {}
);
const [qdnMessagesLoading, setQdnMessagesLoading] = useState<
  Record<string, boolean>
>({});
```

d) Add a handler that fires when a row is expanded to fetch the QDN message for received txs:

```ts
const handleToggleExpand = useCallback(
  (i: number) => {
    const wasExpanded = expandedTx === i;
    setExpandedTx(wasExpanded ? null : i);

    if (!wasExpanded) {
      const row = transactions[i];
      if (!row.txHash) return;
      const txHash = row.txHash;

      // Already fetched or it's a sent tx (cached message takes priority)
      if (
        qdnMessages[txHash] !== undefined ||
        getCachedMessage(txHash) !== null
      )
        return;

      // Determine sender QORT address
      let senderQortAddress: string | undefined;
      if (chain.isNative && row.sender) {
        senderQortAddress = row.sender;
      } else if (!chain.isNative && row.sender) {
        // Look up in address book by foreign address
        const book = getAddressBook(chain.coinEnum as any);
        const entry = book.find((e) => e.address === row.sender);
        senderQortAddress = entry?.qortAddress;
      }

      if (!senderQortAddress) return;

      setQdnMessagesLoading((prev) => ({ ...prev, [txHash]: true }));
      fetchNameForAddress(senderQortAddress)
        .then((senderName) => {
          if (!senderName) return Promise.resolve(null);
          return fetchPaymentMessage(senderName, txHash);
        })
        .then((msg) => {
          setQdnMessages((prev) => ({ ...prev, [txHash]: msg }));
        })
        .finally(() => {
          setQdnMessagesLoading((prev) => ({ ...prev, [txHash]: false }));
        });
    }
  },
  [expandedTx, transactions, qdnMessages, chain]
);
```

You will also need to import `getAddressBook` from `../../utils/addressBookStorage`.

e) Replace the entire `transactions.map((row, i) => { ... })` block with:

```tsx
{
  transactions.map((row, i) => (
    <TransactionRow
      key={i}
      row={row}
      index={i}
      isLastRow={i === transactions.length - 1}
      chain={chain}
      userAddress={address}
      expanded={expandedTx === i}
      onToggleExpand={() => handleToggleExpand(i)}
      copiedHash={copiedHash}
      onCopyHash={handleCopyHash}
      qdnMessage={row.txHash ? qdnMessages[row.txHash] : undefined}
      qdnMessageLoading={row.txHash ? qdnMessagesLoading[row.txHash] : false}
    />
  ));
}
```

f) Remove the old inline `setExpandedTx(expanded ? null : i)` onClick and the old `expanded` const from inside the map — those are now handled by `handleToggleExpand` and the prop.

- [ ] **Step 3: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/wallet/TransactionRow.tsx src/components/wallet/CoinDetail.tsx
git commit -m "feat(tx-row): extract TransactionRow component and add message display"
```

---

## Task 4: Add message and QORT recipient fields to send dialog

**Files:**

- Modify: `src/components/wallet/CoinDetail.tsx`
- Modify: `src/i18n/locales/en/core.json`

- [ ] **Step 1: Add new i18n keys**

In `src/i18n/locales/en/core.json`, add inside the `"send_dialog"` object after `"recipient_address"`:

```json
"message_label": "payment message (optional)",
"message_max_chars": "{{ count }}/280",
"recipient_qort_label": "recipient's QORT address or name",
"qort_resolve_failed": "QORT address could not be resolved"
```

- [ ] **Step 2: Add new state to CoinDetail**

In `src/components/wallet/CoinDetail.tsx`, add these state variables after the existing `const [foreignFeePerByte, ...]` line:

```ts
const [paymentMessage, setPaymentMessage] = useState('');
const [recipientQort, setRecipientQort] = useState('');
const [recipientQortAddress, setRecipientQortAddress] = useState<string | null>(
  null
);
const [qortResolving, setQortResolving] = useState(false);
const [qortResolveFailed, setQortResolveFailed] = useState(false);
```

Add new imports at the top:

```ts
import {
  getCachedMessage,
  fetchPaymentMessage,
  fetchNameForAddress,
  resolveQortName,
  fetchPublicKey,
  publishPaymentMessage,
  buildMessagePayload,
  cacheMessage,
} from '../../utils/paymentMessages';
import { getAddressBook } from '../../utils/addressBookStorage';
import { useAuth } from 'qapp-core';
```

Add at the top of `CoinDetail`:

```ts
const { address: userQortAddress, name: userQortName } = useAuth();
```

- [ ] **Step 3: Auto-populate QORT address from address book when recipient changes**

The `recipient` field already has a state and TextField. Add a `useEffect` that watches `recipient` and looks it up in the address book:

```ts
useEffect(() => {
  if (!paymentMessage || !recipient) {
    setRecipientQort('');
    setRecipientQortAddress(null);
    setQortResolveFailed(false);
    return;
  }
  const book = getAddressBook(chain.coinEnum as any);
  const entry = book.find((e) => e.address === recipient.trim());
  if (entry?.qortAddress) {
    setRecipientQort(entry.qortAddress);
  }
}, [recipient, paymentMessage, chain.coinEnum]);
```

- [ ] **Step 4: Add QORT name resolution on blur**

Add a function to resolve the QORT field value to an address:

```ts
const resolveQortField = useCallback(async () => {
  const val = recipientQort.trim();
  if (!val) {
    setRecipientQortAddress(null);
    return;
  }

  // Already a Q address — use directly
  if (val.startsWith('Q') && val.length > 20) {
    setRecipientQortAddress(val);
    setQortResolveFailed(false);
    return;
  }

  setQortResolving(true);
  setQortResolveFailed(false);
  const addr = await resolveQortName(val);
  setQortResolving(false);
  if (addr) {
    setRecipientQortAddress(addr);
  } else {
    setRecipientQortAddress(null);
    setQortResolveFailed(true);
  }
}, [recipientQort]);
```

- [ ] **Step 5: Add message and QORT fields to send dialog JSX**

In the send dialog form section (the `<>` block inside `sendResult === null`), add these two fields after the existing Recipient `<TextField>` and before the Fee field:

```tsx
{
  /* Payment message — optional */
}
<TextField
  label={t('send_dialog.message_label')}
  value={paymentMessage}
  onChange={(e) => {
    if (e.target.value.length <= 280) setPaymentMessage(e.target.value);
  }}
  fullWidth
  multiline
  rows={2}
  disabled={sending}
  helperText={paymentMessage ? `${paymentMessage.length}/280` : undefined}
/>;

{
  /* QORT recipient — only shown when message is non-empty */
}
{
  paymentMessage && (
    <TextField
      label={t('send_dialog.recipient_qort_label')}
      value={recipientQort}
      onChange={(e) => {
        setRecipientQort(e.target.value);
        setRecipientQortAddress(null);
        setQortResolveFailed(false);
      }}
      onBlur={resolveQortField}
      fullWidth
      disabled={sending || qortResolving}
      error={qortResolveFailed}
      helperText={
        qortResolveFailed
          ? t('send_dialog.qort_resolve_failed')
          : recipientQortAddress
            ? '✓'
            : undefined
      }
      InputProps={{
        endAdornment: qortResolving ? (
          <CircularProgress size={16} sx={{ color: c.accent }} />
        ) : undefined,
      }}
    />
  );
}
```

- [ ] **Step 6: Reset message state in `openSend` and `closeSend`**

In `openSend`:

```ts
setPaymentMessage('');
setRecipientQort('');
setRecipientQortAddress(null);
setQortResolveFailed(false);
```

In `closeSend`:

```ts
setPaymentMessage('');
setRecipientQort('');
setRecipientQortAddress(null);
setQortResolveFailed(false);
```

- [ ] **Step 7: Publish message after successful send**

In `handleSend`, immediately after `setSendResult('success')` inside the try block, add the fire-and-forget publish:

```ts
setSendResult('success');

// Fire-and-forget: publish encrypted message to QDN if one was written
const msgToCopy = paymentMessage.trim();
const txHashForMsg =
  result?.prepared?.txHash ??
  (chain.isNative ? (result as any)?.signature : undefined);

if (msgToCopy && txHashForMsg && recipientQortAddress && userQortName) {
  const payload = buildMessagePayload(
    msgToCopy,
    txHashForMsg,
    chain.ticker,
    amount
  );
  cacheMessage(txHashForMsg, msgToCopy);
  Promise.all([
    fetchPublicKey(recipientQortAddress),
    fetchPublicKey(userQortAddress ?? ''),
  ])
    .then(([recipPk, senderPk]) => {
      if (recipPk && senderPk) {
        publishPaymentMessage(payload, senderPk, recipPk).catch(() => {});
      }
    })
    .catch(() => {});
}
```

- [ ] **Step 8: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/wallet/CoinDetail.tsx src/i18n/locales/en/core.json
git commit -m "feat(send-dialog): add optional payment message and QORT recipient fields"
```

---

## Task 5: `useUnifiedHistory` hook

**Files:**

- Create: `src/hooks/useUnifiedHistory.ts`
- Create: `src/hooks/__tests__/useUnifiedHistory.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/__tests__/useUnifiedHistory.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUnifiedHistory } from '../useUnifiedHistory';
import type { ChainConfig } from '../../config/chains';

// qdnRequest is a global mocked by the test environment
declare const qdnRequest: ReturnType<typeof vi.fn>;

const QORT_CHAIN: ChainConfig = {
  key: 'QORT',
  name: 'Qortal',
  ticker: 'QORT',
  coinEnum: 'QORT' as any,
  route: 'qort',
  decimalPlaces: 8,
  isNative: true,
  defaultFee: 0.001,
  activeNetwork: 'MAIN',
  supportsHtlc: false,
  supportsLocalChainTrades: false,
};

const LTC_CHAIN: ChainConfig = {
  key: 'LTC',
  name: 'Litecoin',
  ticker: 'LTC',
  coinEnum: 'LTC' as any,
  route: 'ltc',
  decimalPlaces: 8,
  isNative: false,
  defaultFee: 0,
  activeNetwork: 'MAIN',
  supportsHtlc: true,
  supportsLocalChainTrades: true,
};

beforeEach(() => {
  (globalThis as any).qdnRequest = vi.fn();
});

describe('useUnifiedHistory', () => {
  it('returns empty rows and both chains loading initially', () => {
    (globalThis as any).qdnRequest.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useUnifiedHistory([QORT_CHAIN, LTC_CHAIN])
    );
    expect(result.current.rows).toEqual([]);
    expect(result.current.loadingChains).toContain('QORT');
    expect(result.current.loadingChains).toContain('LTC');
  });

  it('populates rows after both chains resolve and sorts by timestamp descending', async () => {
    (globalThis as any).qdnRequest.mockImplementation((opts: any) => {
      if (opts.action === 'GET_USER_WALLET')
        return Promise.resolve({ address: 'Qabc' });
      if (opts.action === 'FETCH_NODE_API')
        return Promise.resolve([
          {
            signature: 'sig1',
            amount: '1',
            fee: '0.001',
            timestamp: 2000,
            creatorAddress: 'Qsender',
            recipient: 'Qabc',
          },
        ]);
      if (opts.action === 'GET_USER_WALLET_TRANSACTIONS')
        return Promise.resolve([
          { txHash: 'hash2', totalAmount: 500000000, timestamp: 1000 },
        ]);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useUnifiedHistory([QORT_CHAIN, LTC_CHAIN])
    );

    await waitFor(() => expect(result.current.loadingChains).toHaveLength(0));

    expect(result.current.rows).toHaveLength(2);
    // First row should be the newer one (timestamp 2000)
    expect(result.current.rows[0].timestamp).toBe(2000);
    expect(result.current.rows[1].timestamp).toBe(1000);
  });

  it('places errored chains in errorChains and removes from loadingChains', async () => {
    (globalThis as any).qdnRequest.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useUnifiedHistory([LTC_CHAIN]));
    await waitFor(() => expect(result.current.loadingChains).toHaveLength(0));
    expect(result.current.errorChains).toContain('LTC');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/hooks/__tests__/useUnifiedHistory.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/useUnifiedHistory.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import type { ChainConfig } from '../config/chains';
import type { TxRow } from '../components/wallet/TransactionRow';
import { requestWithTimeout } from '../common/functions';
import { TIME_MINUTES_5 } from '../common/constants';

export interface UnifiedTxRow extends TxRow {
  chain: ChainConfig;
}

export interface UseUnifiedHistoryResult {
  rows: UnifiedTxRow[];
  loadingChains: string[];
  errorChains: string[];
}

async function fetchChainTxs(chain: ChainConfig): Promise<TxRow[]> {
  if (chain.isNative) {
    const wallet = await qdnRequest({
      action: 'GET_USER_WALLET',
      assetId: 0,
    } as any);
    const addr = wallet?.address;
    if (!addr) return [];

    const data: any[] = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/transactions/search?txType=PAYMENT&address=${encodeURIComponent(addr)}&confirmationStatus=CONFIRMED&limit=20&reverse=true`,
    } as any).then((r: any) => (Array.isArray(r) ? r : []));

    return data.map((tx) => {
      const incoming = tx.recipient === addr;
      const raw = Math.round(parseFloat(tx.amount ?? '0') * 1e8);
      return {
        txHash: tx.signature,
        totalAmount: incoming ? raw : -raw,
        feeAmount: Math.round(parseFloat(tx.fee ?? '0') * 1e8),
        timestamp: tx.timestamp,
        sender: incoming ? (tx.creatorAddress ?? undefined) : addr,
        recipient: tx.recipient,
      };
    });
  } else {
    const res = await requestWithTimeout(
      { action: 'GET_USER_WALLET_TRANSACTIONS', coin: chain.coinEnum } as any,
      TIME_MINUTES_5
    );
    return Array.isArray(res) ? res : [];
  }
}

export function useUnifiedHistory(
  chains: ChainConfig[]
): UseUnifiedHistoryResult {
  const [rows, setRows] = useState<UnifiedTxRow[]>([]);
  const [loadingChains, setLoadingChains] = useState<string[]>([]);
  const [errorChains, setErrorChains] = useState<string[]>([]);

  const addRows = useCallback((newRows: UnifiedTxRow[]) => {
    setRows((prev) =>
      [...prev, ...newRows].sort((a, b) => {
        const at = a.timestamp ?? Infinity;
        const bt = b.timestamp ?? Infinity;
        return bt - at;
      })
    );
  }, []);

  useEffect(() => {
    const nonArrR = chains.filter((c) => c.coinEnum !== 'ARRR');
    setLoadingChains(nonArrR.map((c) => c.ticker));
    setRows([]);
    setErrorChains([]);

    nonArrR.forEach(async (chain) => {
      try {
        const txs = await fetchChainTxs(chain);
        addRows(txs.map((row) => ({ ...row, chain })));
      } catch {
        setErrorChains((prev) => [...prev, chain.ticker]);
      } finally {
        setLoadingChains((prev) => prev.filter((t) => t !== chain.ticker));
      }
    });
  }, [chains]);

  return { rows, loadingChains, errorChains };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/hooks/__tests__/useUnifiedHistory.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useUnifiedHistory.ts src/hooks/__tests__/useUnifiedHistory.test.ts
git commit -m "feat(unified-history): add useUnifiedHistory hook with parallel multi-chain fetch"
```

---

## Task 6: UnifiedHistory page component

**Files:**

- Create: `src/components/wallet/UnifiedHistory.tsx`

- [ ] **Step 1: Create `src/components/wallet/UnifiedHistory.tsx`**

```tsx
import { useState, useCallback } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { uiStyleAtom } from '../../state/global/system';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { useUnifiedHistory } from '../../hooks/useUnifiedHistory';
import { TransactionRow } from './TransactionRow';

type Filter = 'all' | 'received' | 'sent';

export function UnifiedHistory() {
  const c = useColors();
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const navigate = useNavigate();
  const { chains } = useSupportedChains();
  const { rows, loadingChains, errorChains } = useUnifiedHistory(chains);

  const [filter, setFilter] = useState<Filter>('all');
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState<number | null>(null);

  const handleCopyHash = useCallback((i: number, hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(i);
      setTimeout(() => setCopiedHash(null), 2000);
    });
  }, []);

  const hasArrr = chains.some((c) => c.coinEnum === 'ARRR');
  const totalNonArrr = chains.filter((c) => c.coinEnum !== 'ARRR').length;
  const loadedCount = totalNonArrr - loadingChains.length;
  const stillLoading = loadingChains.length > 0;

  const filteredRows = rows.filter((row) => {
    if (filter === 'received') return (row.totalAmount ?? 0) > 0;
    if (filter === 'sent') return (row.totalAmount ?? 0) <= 0;
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isClassic ? c.frameBg : c.bg }}>
      {/* Sub-header */}
      <Box
        sx={{
          position: 'sticky',
          top: `var(--wallet-top-bar-height, ${tokens.spacing.topBarHeight}px)`,
          zIndex: 90,
          bgcolor: c.surface,
          borderBottom: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
          boxShadow: isClassic ? c.topBarShadow : 'none',
          display: 'flex',
          alignItems: 'center',
          px: { xs: isClassic ? 1.5 : 3, sm: 3 },
          py: isClassic ? 1 : 0,
          minHeight: tokens.spacing.topBarHeight,
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
          size="small"
          sx={{ borderRadius: 0, color: c.textPrimary }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            fontWeight: tokens.typography.weightBold,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: '0.85rem',
          }}
        >
          All Transactions
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {stillLoading && (
          <Box sx={{ fontSize: '0.72rem', color: c.textSecondary }}>
            Loaded {loadedCount} of {totalNonArrr}
          </Box>
        )}
        {stillLoading && (
          <CircularProgress size={14} sx={{ color: c.accent }} />
        )}
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: isClassic ? c.layoutWideMaxWidth : c.layoutMaxWidth,
          mx: 'auto',
          px: { xs: isClassic ? 1.5 : 2, md: isClassic ? 3 : 4 },
          py: isClassic ? 3 : 4,
        }}
      >
        {/* Error notice */}
        {errorChains.length > 0 && (
          <Box sx={{ mb: 2, fontSize: '0.75rem', color: c.textSecondary }}>
            Failed to load: {errorChains.join(', ')}
          </Box>
        )}

        {/* ARRR notice */}
        {hasArrr && (
          <Box
            sx={{
              mb: 2,
              px: 2.5,
              py: 1.5,
              fontSize: '0.78rem',
              color: c.textSecondary,
              border: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              bgcolor: c.surface,
            }}
          >
            ARRR requires initialization — visit the ARRR page to sync first.
          </Box>
        )}

        {/* Filter toggles */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {(['all', 'received', 'sent'] as Filter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setFilter(f)}
              disableElevation
              sx={{
                borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : '50px',
                fontSize: '0.72rem',
                textTransform: 'capitalize',
                ...(filter === f
                  ? {
                      bgcolor: c.accent,
                      color: c.accentText,
                      '&:hover': { bgcolor: c.accentHover },
                    }
                  : { borderColor: c.borderLight, color: c.textSecondary }),
              }}
            >
              {f}
            </Button>
          ))}
        </Box>

        {/* Transaction list */}
        <Box
          sx={{
            border: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
            borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
            overflow: 'hidden',
            boxShadow: c.shadowCard,
          }}
        >
          {filteredRows.length === 0 && !stillLoading ? (
            <Box
              sx={{
                py: 6,
                textAlign: 'center',
                color: c.textSecondary,
                fontSize: '0.85rem',
              }}
            >
              No transactions found
            </Box>
          ) : (
            filteredRows.map((row, i) => (
              <TransactionRow
                key={`${row.chain.ticker}-${row.txHash ?? i}`}
                row={row}
                index={i}
                isLastRow={i === filteredRows.length - 1}
                chain={row.chain}
                userAddress=""
                expanded={expandedTx === i}
                onToggleExpand={() =>
                  setExpandedTx(expandedTx === i ? null : i)
                }
                copiedHash={copiedHash}
                onCopyHash={handleCopyHash}
                showCoinBadge
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/wallet/UnifiedHistory.tsx
git commit -m "feat(unified-history): add UnifiedHistory page component"
```

---

## Task 7: Add routes and CoinGrid navigation buttons

**Files:**

- Modify: `src/routes/Routes.tsx`
- Modify: `src/components/wallet/CoinGrid.tsx`
- Modify: `src/i18n/locales/en/core.json`

- [ ] **Step 1: Add new i18n keys**

In `src/i18n/locales/en/core.json`, add at the top level:

```json
"nav_history": "history",
"nav_share_contact": "share contact",
"share_contact_copied": "contact link copied",
"share_contact_publishing": "publishing..."
```

- [ ] **Step 2: Register new routes**

In `src/routes/Routes.tsx`, add imports:

```ts
import { UnifiedHistory } from '../components/wallet/UnifiedHistory';
import { ContactCard } from '../components/wallet/ContactCard';
```

Add two new routes inside the `children` array:

```ts
{ path: 'history', element: <UnifiedHistory /> },
{ path: 'contact/:qortName', element: <ContactCard /> },
```

- [ ] **Step 3: Add History and Share Contact buttons to CoinGrid**

In `src/components/wallet/CoinGrid.tsx`:

Add imports:

```ts
import HistoryIcon from '@mui/icons-material/History';
import ShareIcon from '@mui/icons-material/Share';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'qapp-core';
```

Add state and auth hook after the existing `useState` calls:

```ts
const { t } = useTranslation('core');
const { name: userName } = useAuth();
const [shareToast, setShareToast] = useState('');
```

Add a `handleShareContact` function inside `CoinGrid`:

```ts
const handleShareContact = useCallback(async () => {
  setShareToast(t('share_contact_publishing'));
  try {
    // Collect all addresses for enabled chains
    const addressResults = await Promise.all(
      chains.map(async (chain) => {
        try {
          const res = await qdnRequest(
            chain.isNative
              ? { action: 'GET_USER_WALLET', assetId: 0 }
              : { action: 'GET_USER_WALLET', coin: chain.coinEnum }
          );
          return { ticker: chain.ticker, address: res?.address };
        } catch {
          return { ticker: chain.ticker, address: undefined };
        }
      })
    );

    const addresses: Record<string, string> = {};
    addressResults.forEach(({ ticker, address }) => {
      if (address) addresses[ticker] = address;
    });

    const qortAddr = addresses['QORT'] ?? '';
    // userName comes from useAuth() — add at top of CoinGrid:
    // const { name: userName } = useAuth();
    // Pass userName into handleShareContact via the closure.

    const card = {
      qortName: userName,
      qortAddress: qortAddr,
      addresses,
      updatedAt: Date.now(),
    };

    await qdnRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      service: 'ARBITRARY',
      identifier: 'wallet-contact-card',
      data64: btoa(JSON.stringify(card)),
    } as any);

    const link = `#/contact/${userName}`;
    await navigator.clipboard.writeText(link);
    setShareToast(t('share_contact_copied'));
    setTimeout(() => setShareToast(''), 2500);
  } catch {
    setShareToast('');
  }
}, [chains, t]);
```

Add the two buttons in the CoinGrid return JSX, above the `<DndContext>` block:

```tsx
<Box sx={{ display: 'flex', gap: 1, mb: 1.5, justifyContent: 'flex-end' }}>
  {shareToast && (
    <Box
      sx={{
        fontSize: '0.75rem',
        color: c.textSecondary,
        display: 'flex',
        alignItems: 'center',
        mr: 1,
      }}
    >
      {shareToast}
    </Box>
  )}
  <Button
    size="small"
    startIcon={<ShareIcon sx={{ fontSize: '0.9rem !important' }} />}
    onClick={handleShareContact}
    sx={{ color: c.textSecondary, fontSize: '0.72rem', textTransform: 'none' }}
  >
    {t('nav_share_contact')}
  </Button>
  <Button
    size="small"
    startIcon={<HistoryIcon sx={{ fontSize: '0.9rem !important' }} />}
    onClick={() => navigate('/history')}
    sx={{ color: c.textSecondary, fontSize: '0.72rem', textTransform: 'none' }}
  >
    {t('nav_history')}
  </Button>
</Box>
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Routes.tsx src/components/wallet/CoinGrid.tsx src/i18n/locales/en/core.json
git commit -m "feat: add /history and /contact routes, History and Share Contact buttons"
```

---

## Task 8: ContactCard page component

**Files:**

- Create: `src/components/wallet/ContactCard.tsx`
- Modify: `src/i18n/locales/en/core.json`

- [ ] **Step 1: Add i18n keys**

In `src/i18n/locales/en/core.json`, add:

```json
"contact_card_title": "contact card",
"contact_card_qort_name": "QORT name",
"contact_card_qort_address": "QORT address",
"contact_card_addresses": "wallet addresses",
"contact_card_add_all": "add to address book",
"contact_card_not_found": "contact card not found",
"contact_card_import_success": "addresses imported"
```

- [ ] **Step 2: Create `src/components/wallet/ContactCard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { uiStyleAtom } from '../../state/global/system';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { useCoinImageUrl } from '../../hooks/useCoinImageUrl';
import { addAddress, getAddressBook } from '../../utils/addressBookStorage';

interface ContactCardData {
  qortName: string;
  qortAddress: string;
  addresses: Record<string, string>;
  updatedAt: number;
}

function CoinAddressRow({
  ticker,
  address,
}: {
  ticker: string;
  address: string;
}) {
  const c = useColors();
  const coinImageUrl = useCoinImageUrl(ticker);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
      {coinImageUrl && (
        <Box
          component="img"
          src={coinImageUrl}
          alt={ticker}
          sx={{ height: 18, width: 18, objectFit: 'contain', flexShrink: 0 }}
        />
      )}
      <Box
        sx={{
          fontWeight: tokens.typography.weightBold,
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: c.textSecondary,
          minWidth: 36,
        }}
      >
        {ticker}
      </Box>
      <Box
        sx={{
          fontFamily: c.monoFontFamily,
          fontSize: '0.75rem',
          color: c.textPrimary,
          wordBreak: 'break-all',
          flex: 1,
        }}
      >
        {address}
      </Box>
    </Box>
  );
}

export function ContactCard() {
  const { qortName } = useParams<{ qortName: string }>();
  const { t } = useTranslation('core');
  const c = useColors();
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const navigate = useNavigate();
  const { chains } = useSupportedChains();

  const [card, setCard] = useState<ContactCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!qortName) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    qdnRequest({
      action: 'FETCH_QDN_RESOURCE',
      service: 'ARBITRARY',
      name: qortName,
      identifier: 'wallet-contact-card',
      encoding: 'base64',
    } as any)
      .then((data: string) => {
        const parsed: ContactCardData = JSON.parse(atob(data));
        setCard(parsed);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [qortName]);

  const handleImport = () => {
    if (!card) return;
    chains.forEach((chain) => {
      const addr = card.addresses[chain.ticker];
      if (!addr) return;
      const existing = getAddressBook(chain.coinEnum as any);
      if (existing.some((e) => e.address === addr)) return;
      try {
        addAddress({
          name: card.qortName,
          address: addr,
          note: '',
          qortAddress: card.qortAddress,
          coinType: chain.coinEnum as any,
        });
      } catch {
        /* duplicate or other error - skip */
      }
    });
    setImported(true);
    setTimeout(() => setImported(false), 3000);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isClassic ? c.frameBg : c.bg }}>
      {/* Sub-header */}
      <Box
        sx={{
          position: 'sticky',
          top: `var(--wallet-top-bar-height, ${tokens.spacing.topBarHeight}px)`,
          zIndex: 90,
          bgcolor: c.surface,
          borderBottom: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          px: { xs: isClassic ? 1.5 : 3, sm: 3 },
          minHeight: tokens.spacing.topBarHeight,
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
          size="small"
          sx={{ borderRadius: 0, color: c.textPrimary }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            fontWeight: tokens.typography.weightBold,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: '0.85rem',
          }}
        >
          {t('contact_card_title')}
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: isClassic ? c.layoutWideMaxWidth : c.layoutMaxWidth,
          mx: 'auto',
          px: { xs: isClassic ? 1.5 : 2, md: isClassic ? 3 : 4 },
          py: isClassic ? 3 : 4,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} sx={{ color: c.accent }} />
          </Box>
        ) : notFound || !card ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              color: c.textSecondary,
              fontSize: '0.85rem',
            }}
          >
            {t('contact_card_not_found')}
          </Box>
        ) : (
          <Box
            sx={{
              border: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              bgcolor: c.surface,
              boxShadow: c.shadowCard,
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* QORT identity */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: t('contact_card_qort_name'), value: card.qortName },
                {
                  label: t('contact_card_qort_address'),
                  value: card.qortAddress,
                  mono: true,
                },
              ].map(({ label, value, mono }) => (
                <Box key={label} sx={{ display: 'flex', gap: 2 }}>
                  <Box
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: tokens.typography.weightBold,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: c.textSecondary,
                      minWidth: 90,
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </Box>
                  <Box
                    sx={{
                      fontFamily: mono ? c.monoFontFamily : undefined,
                      fontSize: '0.8rem',
                      color: c.textPrimary,
                      wordBreak: 'break-all',
                    }}
                  >
                    {value}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Wallet addresses */}
            <Box>
              <Box
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: tokens.typography.weightBold,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: c.textSecondary,
                  mb: 1,
                }}
              >
                {t('contact_card_addresses')}
              </Box>
              {Object.entries(card.addresses).map(([ticker, addr]) => (
                <CoinAddressRow key={ticker} ticker={ticker} address={addr} />
              ))}
            </Box>

            {/* Import button */}
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={imported}
              disableElevation
              sx={{
                alignSelf: 'flex-start',
                bgcolor: imported ? c.success : c.accent,
                color: c.accentText,
                '&:hover': { bgcolor: imported ? c.success : c.accentHover },
                borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : '50px',
                px: 3,
                fontSize: '0.78rem',
              }}
            >
              {imported
                ? t('contact_card_import_success')
                : t('contact_card_add_all')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/wallet/ContactCard.tsx src/i18n/locales/en/core.json
git commit -m "feat(contact-card): add ContactCard page for importing shared wallet contacts"
```

---

## Self-check after all tasks

- [ ] Run the full test suite one final time:

  ```bash
  npm test -- --run
  ```

  Expected: all tests pass, no regressions.

- [ ] TypeScript check:

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] Manually test in Qortium Home:
  - Send QORT with a message; confirm envelope icon appears in tx history
  - Open history page; confirm coins load in parallel and rows are sorted by time
  - Share contact; confirm link copies to clipboard
  - Navigate to `/contact/YourName` and confirm import adds all addresses
