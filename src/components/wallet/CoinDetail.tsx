import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { NumericFormat as _NumericFormat } from 'react-number-format';
const NumericFormat = _NumericFormat as React.FC<
  React.ComponentProps<typeof _NumericFormat> & Record<string, unknown>
>;
import { tokens } from '../../theme/tokens';
import { useColors } from '../../theme/ColorTokensContext';
import type { ChainConfig } from '../../config/chains';
import { epochToAgo, requestWithTimeout } from '../../common/functions';
import {
  EMPTY_STRING,
  TIME_MINUTES_3,
  TIME_MINUTES_5,
  TIME_SECONDS_3,
} from '../../common/constants';

const COIN_ICONS: Record<string, string> = {};
const modules = import.meta.glob('../../assets/*.{svg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
});
for (const [path, url] of Object.entries(modules)) {
  const name = path
    .split('/')
    .pop()
    ?.replace(/\.(svg|png)$/, '')
    .toUpperCase();
  if (name) COIN_ICONS[name] = url as string;
}

interface Props {
  chain: ChainConfig;
}

interface TxRow {
  txHash?: string;
  totalAmount?: number;
  feeAmount?: number;
  timestamp?: number;
  sender?: string;
  recipient?: string;
  inputs?: { address: string; amount: number; addressInWallet?: boolean }[];
  outputs?: { address: string; amount: number; addressInWallet?: boolean }[];
}

// ARRR sync loop limits: 36 × 5 s = 3 min for "not initialized", 60 × 5 s = 5 min for "initializing"
const ARRR_OUTER_MAX = 36;
const ARRR_INNER_MAX = 60;
const ARRR_POLL_MS = 5000;

async function ensureAccountUnlocked(): Promise<boolean> {
  const result = await qortalRequest({ action: 'UNLOCK_SELECTED_ACCOUNT' }) as { isUnlocked?: boolean } | null;
  return result?.isUnlocked === true;
}

export function CoinDetail({ chain }: Props) {
  const c = useColors();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const iconSrc = COIN_ICONS[chain.key];
  const isARRR = chain.coinEnum === 'ARRR';

  const [address, setAddress] = useState<string>(EMPTY_STRING);
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState<number | null>(null);

  const [sendOpen, setSendOpen] = useState(
    () => searchParams.get('send') === 'true'
  );
  const [amount, setAmount] = useState<number>(0);
  const [recipient, setRecipient] = useState(
    () => searchParams.get('to') ?? EMPTY_STRING
  );
  const [fee, setFee] = useState<string>('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(
    null
  );

  // ARRR initialization state
  const cancelSyncRef = useRef(false);
  const [arrrSynced, setArrrSynced] = useState(!isARRR);
  const [arrrSyncing, setArrrSyncing] = useState(isARRR);
  const [arrrSyncStatus, setArrrSyncStatus] = useState(
    'Connecting to Pirate Chain…'
  );
  const [arrrSyncFailed, setArrrSyncFailed] = useState(false);
  const [arrrServers, setArrrServers] = useState<any[]>([]);
  const [arrrServerOpen, setArrrServerOpen] = useState(false);

  const syncArrr = useCallback(async () => {
    cancelSyncRef.current = false;
    setArrrSyncing(true);
    setArrrSyncFailed(false);
    setArrrSynced(false);
    setArrrSyncStatus('Connecting to Pirate Chain…');

    let outerCount = 0;
    let innerCount = 0;

    try {
      while (!cancelSyncRef.current) {
        let status: string;
        try {
          status = await qortalRequest({
            action: 'GET_ARRR_SYNC_STATUS',
          } as any);
        } catch {
          break;
        }
        if (cancelSyncRef.current) return;

        if (status === 'Synchronized') {
          setArrrSynced(true);
          setArrrSyncing(false);
          return;
        }

        // Server returned an XML/HTML error string
        if (typeof status === 'string' && status.includes('<')) break;

        if (status === 'Not initialized yet') {
          outerCount++;
          setArrrSyncStatus('Initializing Pirate Chain wallet…');
          if (outerCount >= ARRR_OUTER_MAX) break;
        } else if (status === 'Initializing wallet...') {
          innerCount++;
          const pct = Math.round((innerCount / ARRR_INNER_MAX) * 100);
          setArrrSyncStatus(`Syncing shielded blockchain… ${pct}%`);
          if (innerCount >= ARRR_INNER_MAX) break;
        } else {
          setArrrSyncStatus(status || 'Syncing…');
        }

        await new Promise<void>((r) => setTimeout(r, ARRR_POLL_MS));
      }
    } catch {
      /* */
    }

    if (cancelSyncRef.current) return;
    setArrrSyncFailed(true);
    setArrrSyncing(false);
    setArrrSyncStatus('Sync failed — try a different server.');
    try {
      const servers = await qortalRequest({
        action: 'GET_CROSSCHAIN_SERVER_INFO',
        coin: 'ARRR',
      } as any);
      if (Array.isArray(servers)) setArrrServers(servers);
    } catch {
      /* */
    }
  }, []);

  const handleServerChange = useCallback(
    async (server: any) => {
      setArrrServerOpen(false);
      try {
        await qortalRequest({
          action: 'SET_CURRENT_FOREIGN_SERVER',
          coin: 'ARRR',
          server,
        } as any);
      } catch {
        /* */
      }
      syncArrr();
    },
    [syncArrr]
  );

  // Kick off ARRR sync once on mount; cancel on unmount
  useEffect(() => {
    if (!isARRR) return;
    syncArrr();
    return () => {
      cancelSyncRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAddress = useCallback(async () => {
    try {
      const res = await qortalRequest({
        action: 'GET_USER_WALLET',
        coin: chain.coinEnum,
      });
      if (res?.address) setAddress(res.address);
    } catch {
      /* silent */
    }
  }, [chain.coinEnum]);

  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY = 1500;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY));
      try {
        let result: string;
        if (chain.isNative) {
          const wallet = await qortalRequest({
            action: 'GET_USER_WALLET',
            coin: chain.coinEnum,
          } as any);
          if (!wallet?.address) throw new Error('no address');
          const res = await fetch(
            `/addresses/balance/${encodeURIComponent(wallet.address)}`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          result = String((await res.json()) ?? 0);
        } else {
          const res = await requestWithTimeout(
            { action: 'GET_WALLET_BALANCE', coin: chain.coinEnum },
            TIME_MINUTES_5
          );
          if (res?.error) throw new Error(res.error);
          result = res ?? '0';
        }
        setBalance(result);
        setLoadingBalance(false);
        return;
      } catch {
        /* retry */
      }
    }
    setBalance(null);
    setLoadingBalance(false);
  }, [chain.coinEnum, chain.isNative]);

  const fetchTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      if (chain.isNative) {
        const wallet = await qortalRequest({
          action: 'GET_USER_WALLET',
          coin: chain.coinEnum,
        } as any);
        const addr = wallet?.address;
        if (!addr) {
          setTransactions([]);
          return;
        }
        const res = await fetch(
          `/transactions/search?txType=PAYMENT&address=${encodeURIComponent(addr)}&confirmationStatus=CONFIRMED&limit=20&reverse=true`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any[] = await res.json();
        const rows: TxRow[] = data.map((tx) => {
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
        setTransactions(rows);
      } else {
        const res = await requestWithTimeout(
          { action: 'GET_USER_WALLET_TRANSACTIONS', coin: chain.coinEnum },
          TIME_MINUTES_5
        );
        const txs = Array.isArray(res) ? res : [];
        setTransactions(chain.coinEnum === 'ARRR' ? [...txs].reverse() : txs);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  }, [chain.coinEnum, chain.isNative]);

  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  // Fetch balance + tx only after ARRR has synced (for other chains arrrSynced starts true)
  useEffect(() => {
    if (!arrrSynced) return;
    fetchBalance();
    fetchTransactions();
    const id = setInterval(() => {
      fetchBalance();
      fetchTransactions();
    }, TIME_MINUTES_3);
    return () => clearInterval(id);
  }, [fetchBalance, fetchTransactions, arrrSynced]);

  const openSend = useCallback(async () => {
    setAmount(0);
    setRecipient(EMPTY_STRING);
    setSendResult(null);
    setFee(String(chain.defaultFee));
    setSendOpen(true);
    if (chain.isNative || chain.coinEnum === 'ARRR') return;
    setFeeLoading(true);
    try {
      const res = await qortalRequest({
        action: 'GET_FOREIGN_FEE',
        coin: chain.coinEnum,
        type: 'TRADE',
      } as any);
      const live =
        res?.fee ??
        (typeof res === 'number' || typeof res === 'string' ? res : null);
      if (live != null) setFee(String(live));
    } catch {
      /* keep hardcoded fallback */
    }
    setFeeLoading(false);
  }, [chain.coinEnum, chain.defaultFee, chain.isNative]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSend = async () => {
    setSending(true);
    try {
      if (!await ensureAccountUnlocked()) return;
      const payload: Record<string, unknown> = {
        action: 'SEND_COIN',
        coin: chain.coinEnum,
        recipient,
        amount,
      };
      if (chain.coinEnum !== 'ARRR' && fee !== '') {
        payload.fee = parseFloat(fee);
      }
      await qortalRequest(payload as any);
      setSendResult('success');
      setAmount(0);
      setRecipient(EMPTY_STRING);
      await new Promise((r) => setTimeout(r, TIME_SECONDS_3));
      fetchBalance();
      fetchTransactions();
    } catch {
      setSendResult('error');
    } finally {
      setSending(false);
    }
  };

  const closeSend = () => {
    setSendOpen(false);
    setSendResult(null);
    setAmount(0);
    setRecipient(EMPTY_STRING);
    setFee('');
    setSearchParams({});
  };

  const divisor = Math.pow(10, chain.decimalPlaces);

  const txAmount = (row: TxRow) => {
    const raw = Number(row.totalAmount ?? 0) / divisor;
    return raw.toFixed(chain.decimalPlaces);
  };

  const txFee = (row: TxRow) =>
    (Number(row.feeAmount ?? 0) / divisor).toFixed(chain.decimalPlaces);

  const isPositive = (row: TxRow) => (row.totalAmount ?? 0) > 0;

  const fmtAddr = (addr?: string) => {
    if (!addr) return '—';
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
  };

  const counterparty = (row: TxRow): string | undefined => {
    if (isPositive(row)) {
      if (row.sender) return row.sender;
      const ext = row.inputs?.find((inp) => !inp.addressInWallet);
      return ext?.address;
    } else {
      if (row.recipient) return row.recipient;
      const ext = row.outputs?.find((out) => !out.addressInWallet);
      return ext?.address;
    }
  };

  const handleCopyHash = (i: number, hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(i);
      setTimeout(() => setCopiedHash(null), 2000);
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.bg }}>
      {/* ── sticky sub-header ── */}
      <Box
        sx={{
          position: 'sticky',
          top: tokens.spacing.topBarHeight,
          zIndex: 90,
          bgcolor: c.surface,
          borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          px: 3,
          height: 52,
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
        {iconSrc && (
          <Box
            component="img"
            src={iconSrc}
            alt={chain.ticker}
            sx={{ height: 24, width: 24, objectFit: 'contain' }}
          />
        )}
        <Box
          sx={{
            fontWeight: tokens.typography.weightBold,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: '0.85rem',
          }}
        >
          {chain.name}
        </Box>
        {chain.activeNetwork !== 'MAIN' && (
          <Box
            sx={{
              fontSize: '0.5rem',
              fontWeight: tokens.typography.weightBold,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              px: 0.75,
              py: 0.25,
              borderRadius: '3px',
              bgcolor: c.error,
              color: '#fff',
              lineHeight: 1.4,
            }}
          >
            {chain.activeNetwork.toLowerCase()}
          </Box>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          size="small"
          endIcon={<SendIcon sx={{ fontSize: '1rem !important' }} />}
          onClick={openSend}
          disableElevation
          disabled={isARRR && !arrrSynced}
          sx={{
            bgcolor: c.accent,
            color: c.accentText,
            '&:hover': { bgcolor: c.accentHover },
            '&.Mui-disabled': { opacity: 0.4 },
            borderRadius: '50px',
            px: 2.5,
            letterSpacing: '0.06em',
            fontWeight: tokens.typography.weightBold,
            fontSize: '0.75rem',
          }}
        >
          Send
        </Button>
      </Box>

      <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {isARRR && !arrrSynced ? (
          /* ── ARRR initialization overlay ── */
          <Box
            sx={{
              border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
              borderRadius: `${tokens.shape.radius}px`,
              bgcolor: c.surface,
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              p: { xs: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 3,
            }}
          >
            {iconSrc && (
              <Box
                component="img"
                src={iconSrc}
                alt="ARRR"
                sx={{
                  height: 56,
                  width: 56,
                  objectFit: 'contain',
                  opacity: arrrSyncFailed ? 0.35 : 0.75,
                }}
              />
            )}
            {arrrSyncing && (
              <CircularProgress size={36} sx={{ color: c.accent }} />
            )}
            <Box>
              <Box
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: tokens.typography.weightBold,
                  color: arrrSyncFailed ? c.error : c.textPrimary,
                  mb: 0.75,
                }}
              >
                {arrrSyncStatus}
              </Box>
              {!arrrSyncFailed && (
                <Box
                  sx={{
                    fontSize: '0.78rem',
                    color: c.textSecondary,
                    maxWidth: 380,
                    lineHeight: 1.6,
                  }}
                >
                  Pirate Chain uses a shielded blockchain that must sync before
                  balances or transactions are available.
                </Box>
              )}
            </Box>
            {arrrSyncFailed && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="contained"
                  onClick={syncArrr}
                  disableElevation
                  sx={{
                    bgcolor: c.accent,
                    color: c.accentText,
                    '&:hover': { bgcolor: c.accentHover },
                    borderRadius: '50px',
                    px: 3,
                  }}
                >
                  Retry
                </Button>
                {arrrServers.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => setArrrServerOpen(true)}
                    sx={{
                      borderColor: c.accent,
                      color: c.accent,
                      '&:hover': {
                        borderColor: c.accentHover,
                        color: c.accentHover,
                      },
                      borderRadius: '50px',
                      px: 3,
                    }}
                  >
                    Change Server
                  </Button>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <>
            {/* ── balance hero ── */}
            <Box
              sx={{
                border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                borderRadius: `${tokens.shape.radius}px ${tokens.shape.radius}px 0 0`,
                bgcolor: c.surface,
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                p: { xs: 3, md: 5 },
                mb: 0,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                gap: { xs: 3, sm: 4 },
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                {iconSrc && (
                  <Box
                    component="img"
                    src={iconSrc}
                    alt={chain.ticker}
                    sx={{ height: 56, width: 56, objectFit: 'contain', mb: 2 }}
                  />
                )}
                {loadingBalance ? (
                  <Skeleton width={220} height={64} sx={{ mx: 'auto' }} />
                ) : (
                  <Typography
                    sx={{
                      fontSize: { xs: '2rem', md: '3rem' },
                      fontWeight: tokens.typography.weightBlack,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      color: c.textPrimary,
                      wordBreak: 'break-all',
                    }}
                  >
                    {balance ?? '—'}
                    <Box
                      component="span"
                      sx={{
                        fontSize: '1.1rem',
                        fontWeight: tokens.typography.weightBold,
                        ml: 1.5,
                        color: c.textSecondary,
                      }}
                    >
                      {chain.ticker}
                    </Box>
                  </Typography>
                )}
              </Box>

              {address && (
                <Box
                  sx={{
                    flexShrink: 0,
                    p: 1.5,
                    bgcolor: '#fff',
                    borderRadius: `${tokens.shape.radius / 2}px`,
                    display: 'flex',
                  }}
                >
                  <QRCode
                    value={address}
                    size={120}
                    bgColor="#ffffff"
                    fgColor="#111111"
                  />
                </Box>
              )}
            </Box>

            {/* ── address bar ── */}
            <Box
              onClick={handleCopy}
              sx={{
                border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                borderTop: 'none',
                borderRadius: `0 0 ${tokens.shape.radius}px ${tokens.shape.radius}px`,
                bgcolor: copied ? c.accent : c.surface,
                display: 'flex',
                alignItems: 'center',
                px: 2.5,
                py: 1.5,
                gap: 1.5,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                mb: 4,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  letterSpacing: '0.04em',
                  color: copied ? c.accentText : c.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                }}
              >
                {address || '—'}
              </Box>
              {copied ? (
                <CheckIcon sx={{ fontSize: 16, color: c.accentText }} />
              ) : (
                <ContentCopyIcon
                  sx={{ fontSize: 16, color: c.textSecondary }}
                />
              )}
              <Box
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: tokens.typography.weightBold,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: copied ? c.accentText : c.textSecondary,
                  transition: 'color 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copied' : 'Click to copy'}
              </Box>
            </Box>

            {/* ── transaction history ── */}
            <Box
              sx={{
                fontWeight: tokens.typography.weightBold,
                fontSize: '0.65rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: c.textSecondary,
                mb: 1.5,
              }}
            >
              Transactions
            </Box>

            <Box
              sx={{
                border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                borderRadius: `${tokens.shape.radius}px`,
                overflow: 'hidden',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              }}
            >
              {loadingTx ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} sx={{ color: c.accent }} />
                </Box>
              ) : transactions.length === 0 ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: 'center',
                    color: c.textSecondary,
                    fontSize: '0.85rem',
                    letterSpacing: '0.06em',
                  }}
                >
                  No transactions yet
                </Box>
              ) : (
                transactions.map((row, i) => {
                  const expanded = expandedTx === i;
                  const cp = counterparty(row);
                  return (
                    <Box
                      key={i}
                      sx={{
                        borderBottom:
                          i < transactions.length - 1
                            ? `1px solid ${c.borderLight}`
                            : 'none',
                      }}
                    >
                      <Box
                        onClick={() => setExpandedTx(expanded ? null : i)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          px: 2.5,
                          py: 1.75,
                          gap: 2,
                          cursor: 'pointer',
                          bgcolor: expanded ? c.borderLight : 'transparent',
                          '&:hover': { bgcolor: c.borderLight },
                          transition: 'background-color 0.12s ease',
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            flexShrink: 0,
                            bgcolor: isPositive(row) ? c.success : c.error,
                          }}
                        />

                        <Box
                          sx={{
                            fontWeight: tokens.typography.weightBold,
                            fontSize: '0.9rem',
                            color: isPositive(row) ? c.success : c.error,
                            minWidth: { xs: 90, sm: 140 },
                            flexShrink: 0,
                          }}
                        >
                          {isPositive(row) ? '+' : ''}
                          {txAmount(row)} {chain.ticker}
                        </Box>

                        <Box
                          sx={{
                            flex: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            color: c.textSecondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cp
                            ? isPositive(row)
                              ? `from ${fmtAddr(cp)}`
                              : `to ${fmtAddr(cp)}`
                            : '—'}
                        </Box>

                        <Box
                          sx={{
                            fontSize: '0.7rem',
                            color: c.textSecondary,
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          {row.timestamp
                            ? epochToAgo(row.timestamp)
                            : 'Unconfirmed'}
                        </Box>
                      </Box>

                      {expanded && (
                        <Box
                          sx={{
                            px: 3,
                            py: 2,
                            bgcolor: c.bg,
                            borderTop: `1px solid ${c.borderLight}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.25,
                          }}
                        >
                          {[
                            {
                              label: 'Hash',
                              value: row.txHash,
                              mono: true,
                              copyIdx: i,
                            },
                            {
                              label: isPositive(row) ? 'From' : 'To',
                              value: cp,
                              mono: true,
                            },
                            {
                              label: isPositive(row) ? 'To' : 'From',
                              value: isPositive(row)
                                ? address
                                : (row.sender ?? address),
                              mono: true,
                            },
                            {
                              label: 'Fee',
                              value:
                                row.feeAmount != null
                                  ? `${txFee(row)} ${chain.ticker}`
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
                                sx={{
                                  display: 'flex',
                                  gap: 2,
                                  alignItems: 'center',
                                }}
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
                                    fontFamily: mono ? 'monospace' : undefined,
                                    fontSize: '0.75rem',
                                    color: c.textPrimary,
                                    wordBreak: 'break-all',
                                    flex: 1,
                                  }}
                                >
                                  {value}
                                </Box>
                                {copyIdx != null && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyHash(copyIdx, value!);
                                    }}
                                    sx={{ flexShrink: 0, p: 0.5 }}
                                  >
                                    {copiedHash === copyIdx ? (
                                      <CheckIcon
                                        sx={{ fontSize: 14, color: c.success }}
                                      />
                                    ) : (
                                      <ContentCopyIcon
                                        sx={{
                                          fontSize: 14,
                                          color: c.textSecondary,
                                        }}
                                      />
                                    )}
                                  </IconButton>
                                )}
                              </Box>
                            ) : null
                          )}

                          {row.inputs?.length || row.outputs?.length ? (
                            <Box
                              sx={{
                                mt: 0.5,
                                display: 'flex',
                                gap: 3,
                                flexWrap: 'wrap',
                              }}
                            >
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
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        color: inp.addressInWallet
                                          ? c.accent
                                          : c.textSecondary,
                                      }}
                                    >
                                      {fmtAddr(inp.address)} ·{' '}
                                      {(inp.amount / divisor).toFixed(
                                        chain.decimalPlaces
                                      )}
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
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        color: out.addressInWallet
                                          ? c.accent
                                          : c.textSecondary,
                                      }}
                                    >
                                      {fmtAddr(out.address)} ·{' '}
                                      {(out.amount / divisor).toFixed(
                                        chain.decimalPlaces
                                      )}
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
                })
              )}
            </Box>
          </>
        )}
      </Box>

      {/* ── send dialog ── */}
      <Dialog
        open={sendOpen}
        onClose={closeSend}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
            borderRadius: 0,
            bgcolor: c.surface,
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 3,
              py: 2,
              borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
            }}
          >
            <Box
              sx={{
                fontWeight: tokens.typography.weightBold,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: '0.85rem',
                flexGrow: 1,
              }}
            >
              Send {chain.ticker}
            </Box>
            <IconButton
              size="small"
              onClick={closeSend}
              sx={{ borderRadius: 0 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box
            sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            {sendResult === 'success' ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckIcon sx={{ fontSize: 48, color: c.success, mb: 1 }} />
                <Typography
                  sx={{
                    fontWeight: tokens.typography.weightBold,
                    letterSpacing: '0.06em',
                  }}
                >
                  Transaction sent
                </Typography>
              </Box>
            ) : sendResult === 'error' ? (
              <Box sx={{ textAlign: 'center', py: 3, color: c.error }}>
                <Typography sx={{ fontWeight: tokens.typography.weightBold }}>
                  Something went wrong. Please try again.
                </Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    color: c.textSecondary,
                    fontSize: '0.8rem',
                    letterSpacing: '0.06em',
                  }}
                >
                  Balance:{' '}
                  <Box
                    component="span"
                    sx={{
                      color: c.textPrimary,
                      fontWeight: tokens.typography.weightBold,
                    }}
                  >
                    {balance ?? '—'} {chain.ticker}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <NumericFormat
                    decimalScale={8}
                    value={amount}
                    allowNegative={false}
                    customInput={TextField as React.ComponentType<any>}
                    valueIsNumericString
                    label={`Amount (${chain.ticker})`}
                    fullWidth
                    onValueChange={(v) => setAmount(v.floatValue ?? 0)}
                    disabled={sending}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={sending || !balance}
                    onClick={() => {
                      const bal = parseFloat(balance ?? '0');
                      const feeVal = parseFloat(fee || '0');
                      const factor = Math.pow(10, chain.decimalPlaces);
                      setAmount(
                        Math.max(
                          0,
                          Math.floor((bal - feeVal) * factor) / factor
                        )
                      );
                    }}
                    sx={{
                      mt: '8px',
                      flexShrink: 0,
                      borderRadius: '50px',
                      borderColor: c.accent,
                      color: c.accent,
                      fontSize: '0.7rem',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        borderColor: c.accentHover,
                        color: c.accentHover,
                      },
                    }}
                  >
                    Max
                  </Button>
                </Box>

                <TextField
                  label="Recipient address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                  fullWidth
                  disabled={sending}
                />

                <TextField
                  label={`Optional custom fee (${chain.ticker})`}
                  value={feeLoading ? 'Loading…' : fee}
                  onChange={(e) => setFee(e.target.value)}
                  fullWidth
                  disabled={sending || feeLoading}
                  type={feeLoading ? 'text' : 'number'}
                  inputProps={{ step: 'any', min: 0 }}
                  helperText={
                    chain.coinEnum === 'ARRR'
                      ? 'ARRR network fee is fixed — this value is for display only'
                      : undefined
                  }
                />

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSend}
                  disabled={sending || amount <= 0 || !recipient}
                  disableElevation
                  sx={{
                    bgcolor: c.accent,
                    color: c.accentText,
                    '&:hover': { bgcolor: c.accentHover },
                    '&.Mui-disabled': { bgcolor: c.borderLight },
                    borderRadius: 0,
                    py: 1.5,
                  }}
                >
                  {sending ? (
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                  ) : (
                    'Confirm Send'
                  )}
                </Button>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── ARRR server selection dialog ── */}
      {isARRR && arrrServers.length > 0 && (
        <Dialog
          open={arrrServerOpen}
          onClose={() => setArrrServerOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
              borderRadius: 0,
              bgcolor: c.surface,
            },
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
              }}
            >
              <Box
                sx={{
                  fontWeight: tokens.typography.weightBold,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                  flexGrow: 1,
                }}
              >
                Select Lightwallet Server
              </Box>
              <IconButton
                size="small"
                onClick={() => setArrrServerOpen(false)}
                sx={{ borderRadius: 0 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {arrrServers.map((server, i) => (
              <Box
                key={i}
                onClick={() => handleServerChange(server)}
                sx={{
                  px: 3,
                  py: 1.75,
                  borderBottom:
                    i < arrrServers.length - 1
                      ? `1px solid ${c.borderLight}`
                      : 'none',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: c.borderLight },
                  transition: 'background-color 0.12s ease',
                }}
              >
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: c.textPrimary,
                  }}
                >
                  {server.hostName ??
                    server.hostname ??
                    server.host ??
                    JSON.stringify(server)}
                  {server.port ? `:${server.port}` : ''}
                </Box>
                {server.connectionType && (
                  <Box
                    sx={{
                      fontSize: '0.65rem',
                      color: c.textSecondary,
                      mt: 0.25,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {server.connectionType}
                  </Box>
                )}
              </Box>
            ))}
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
