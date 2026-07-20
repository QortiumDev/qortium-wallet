import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  Skeleton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DnsIcon from '@mui/icons-material/Dns';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import _QRCodeDefault from 'react-qr-code';
// CJS interop guard: Vite/Rollup may resolve the default import to the module
// namespace object rather than exports.default when __esModule is set via
// Object.defineProperty. Extracting .default handles both cases safely.
const QRCode = ((_QRCodeDefault as any).default ??
  _QRCodeDefault) as typeof _QRCodeDefault;
import { useAtomValue } from 'jotai';
import { NumericFormat as _NumericFormat } from 'react-number-format';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { copyToClipboard, formatFiat } from '../../common/functions';
const NumericFormat = _NumericFormat as React.FC<
  React.ComponentProps<typeof _NumericFormat> & Record<string, unknown>
>;
import { tokens } from '../../theme/tokens';
import { useColors } from '../../theme/ColorTokensContext';
import {
  uiStyleAtom,
  currencyAtom,
  walletReadyAtom,
} from '../../state/global/system';
import { useCoinImageUrl } from '../../hooks/useCoinImageUrl';
import type { ChainConfig } from '../../config/chains';
import {
  PreparedTransactionPreview,
  type PreparedTransaction,
} from './PreparedTransactionPreview';
import {
  isOptionalPositiveDecimal,
  isPositiveDecimal,
  isValidRecipient,
} from '../../utils/walletSend';
import { requestWithTimeout } from '../../common/functions';
import {
  EMPTY_STRING,
  TIME_MINUTES_3,
  TIME_MINUTES_5,
  TIME_SECONDS_3,
} from '../../common/constants';
import { TransactionRow, type TxRow } from './TransactionRow';

interface Props {
  chain: ChainConfig;
}

interface SendCoinResult {
  prepared?: PreparedTransaction;
}

// ARRR sync loop limits: 36 × 5 s = 3 min for "not initialized", 60 × 5 s = 5 min for "initializing"
const ARRR_OUTER_MAX = 36;
const ARRR_INNER_MAX = 60;
const ARRR_POLL_MS = 5000;

async function ensureAccountUnlocked(): Promise<boolean> {
  const result = (await qdnRequest({
    action: 'UNLOCK_SELECTED_ACCOUNT',
  })) as { isUnlocked?: boolean } | null;
  return result?.isUnlocked === true;
}

function walletRequestForChain(chain: ChainConfig): QdnRequestOptions {
  return chain.isNative
    ? { action: 'GET_USER_WALLET', assetId: 0 }
    : { action: 'GET_USER_WALLET', coin: chain.coinEnum };
}

export function CoinDetail({ chain }: Props) {
  const c = useColors();
  const { t } = useTranslation('core');
  const uiStyle = useAtomValue(uiStyleAtom);
  const currency = useAtomValue(currencyAtom);
  const walletReady = useAtomValue(walletReadyAtom);
  const prices = useMarketPrices();
  const pricePerUnit = prices[chain.coinEnum];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const coinImageUrl = useCoinImageUrl(chain.ticker);
  const isARRR = chain.coinEnum === 'ARRR';
  const isClassic = uiStyle === 'classic';

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
  const [amount, setAmount] = useState<string>('');
  const [sendMax, setSendMax] = useState(false);
  const [recipient, setRecipient] = useState(
    () => searchParams.get('to') ?? EMPTY_STRING
  );
  const [nativeFee, setNativeFee] = useState<string>('');
  const [foreignFeePerByte, setForeignFeePerByte] = useState<string>('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(
    null
  );
  const [sendResponse, setSendResponse] = useState<SendCoinResult | null>(null);

  // SHOW_ACTIONS capability flags (updated on mount)
  const [canSend, setCanSend] = useState(true);
  const [walletAvailable, setWalletAvailable] = useState(true);

  // ARRR initialization state
  const cancelSyncRef = useRef(false);
  const isMountedRef = useRef(true);
  const [arrrSynced, setArrrSynced] = useState(!isARRR);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const [arrrSyncing, setArrrSyncing] = useState(isARRR);
  const [arrrSyncStatus, setArrrSyncStatus] = useState(
    'Connecting to Pirate Chain…'
  );
  const [arrrSyncFailed, setArrrSyncFailed] = useState(false);
  const [arrrServers, setArrrServers] = useState<any[]>([]);
  const [arrrServerOpen, setArrrServerOpen] = useState(false);

  // ElectrumX server management for non-ARRR foreign coins
  const [foreignServers, setForeignServers] = useState<any[]>([]);
  const [foreignServerOpen, setForeignServerOpen] = useState(false);
  const [foreignServerLoading, setForeignServerLoading] = useState(false);

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
          status = await qdnRequest({
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
          setArrrSyncStatus(typeof status === 'string' ? status : 'Syncing…');
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
      const servers = await qdnRequest({
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
        await qdnRequest({
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
      const res = await qdnRequest(walletRequestForChain(chain));
      if (res?.address) setAddress(res.address);
    } catch {
      /* silent */
    }
  }, [chain]);

  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY = 1500;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY));
      try {
        let result: string;
        if (chain.isNative) {
          const res = await qdnRequest({ action: 'GET_QORT_BALANCE' });
          result = String(parseFloat(String(res ?? 0)));
        } else {
          const res = await requestWithTimeout(
            { action: 'GET_WALLET_BALANCE', coin: chain.coinEnum },
            TIME_MINUTES_5
          );
          if (res?.error) throw new Error(res.error);
          // GET_WALLET_BALANCE returns satoshis; convert to coin units
          const divisor = Math.pow(10, chain.decimalPlaces);
          result = res != null ? String(Number(res) / divisor) : '0';
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
  }, [chain]);

  // Check which actions are available on the current node
  useEffect(() => {
    qdnRequest({ action: 'SHOW_ACTIONS' })
      .then((actions: unknown) => {
        if (Array.isArray(actions)) {
          setCanSend(
            chain.isNative
              ? actions.includes('SEND_QORT')
              : actions.includes('SEND_COIN')
          );
          setWalletAvailable(
            chain.isNative || actions.includes('GET_WALLET_BALANCE')
          );
        }
      })
      .catch(() => {
        /* assume full access */
      });
  }, []);

  const openForeignServerDialog = useCallback(async () => {
    setForeignServers([]);
    setForeignServerOpen(true);
    setForeignServerLoading(true);
    try {
      const servers = await qdnRequest({
        action: 'GET_CROSSCHAIN_SERVER_INFO',
        coin: chain.coinEnum,
      });
      if (Array.isArray(servers)) setForeignServers(servers);
    } catch {
      /* */
    }
    setForeignServerLoading(false);
  }, [chain.coinEnum]);

  const handleForeignServerChange = useCallback(
    async (server: any) => {
      setForeignServerOpen(false);
      try {
        await qdnRequest({
          action: 'SET_CURRENT_FOREIGN_SERVER',
          coin: chain.coinEnum,
          server,
        } as any);
      } catch {
        /* */
      }
      fetchBalance();
    },
    [chain.coinEnum, fetchBalance]
  );

  const fetchTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      if (chain.isNative) {
        const wallet = await qdnRequest(walletRequestForChain(chain));
        const addr = wallet?.address;
        if (!addr) {
          setTransactions([]);
          return;
        }
        // QORT history lives on the Qortal chain, so it must go through Home's
        // Qortal-node passthrough, not FETCH_NODE_API (which targets the
        // Qortium node). The bridge returns a result envelope with the
        // transaction list in .data; on Home builds without the action this
        // throws and the catch below leaves the list empty, as before.
        const res = await qdnRequest({
          action: 'FETCH_QORTAL_NODE_API',
          path: `/transactions/search?txType=PAYMENT&address=${encodeURIComponent(addr)}&confirmationStatus=CONFIRMED&limit=20&reverse=true`,
        });
        const data: any[] = Array.isArray(res?.data) ? res.data : [];
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
  }, [chain]);

  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  // Fetch balance + tx only after lock check resolves and ARRR has synced (for other chains arrrSynced starts true)
  useEffect(() => {
    if (!walletReady || !arrrSynced) return;
    fetchBalance();
    fetchTransactions();
    const id = setInterval(() => {
      fetchBalance();
      fetchTransactions();
    }, TIME_MINUTES_3);
    return () => clearInterval(id);
  }, [fetchBalance, fetchTransactions, arrrSynced, walletReady]);

  const openSend = useCallback(async () => {
    setAmount('');
    setSendMax(false);
    setRecipient(EMPTY_STRING);
    setSendResult(null);
    setSendResponse(null);
    setNativeFee(chain.isNative ? String(chain.defaultFee) : '');
    setForeignFeePerByte('');
    setSendOpen(true);
    if (chain.isNative || chain.coinEnum === 'ARRR') return;
    setFeeLoading(true);
    try {
      const res = await qdnRequest({
        action: 'GET_FOREIGN_FEE',
        coin: chain.coinEnum,
        type: 'TRADE',
      } as any);
      const live =
        res?.fee ??
        (typeof res === 'number' || typeof res === 'string' ? res : null);
      if (live != null) setForeignFeePerByte(String(live));
    } catch {
      /* omit fee and let Home/Core choose the default */
    }
    setFeeLoading(false);
  }, [chain.coinEnum, chain.defaultFee, chain.isNative]);

  const handleCopy = () => {
    if (!address) return;
    copyToClipboard(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSend = async () => {
    if (!canConfirmSend) return;

    setSending(true);
    try {
      if (!(await ensureAccountUnlocked())) return;
      let result: SendCoinResult | null = null;
      if (chain.isNative) {
        const res = await qdnRequest({
          action: 'SEND_QORT',
          recipient,
          amount: parseFloat(amount),
        } as any);
        if (res?.accepted === false)
          throw new Error(res.error ?? 'SEND_QORT failed');
        result = res as any;
      } else {
        const payload: Record<string, unknown> = {
          action: 'SEND_COIN',
          recipient,
          coin: chain.coinEnum,
        };
        if (canUseForeignSendMax && sendMax) {
          payload.sendMax = true;
        } else {
          payload.amount = amount;
        }
        if (chain.coinEnum !== 'ARRR' && foreignFeePerByte !== '') {
          payload.feePerByte = foreignFeePerByte.trim();
        }
        result = (await qdnRequest(payload as any)) as SendCoinResult | null;
      }
      setSendResponse(result);
      setSendResult('success');

      window.setTimeout(() => {
        fetchBalance();
        fetchTransactions();
      }, TIME_SECONDS_3);
    } catch {
      setSendResponse(null);
      setSendResult('error');
    } finally {
      setSending(false);
    }
  };

  const closeSend = () => {
    setSendOpen(false);
    setSendResult(null);
    setSendResponse(null);
    setAmount('');
    setSendMax(false);
    setRecipient(EMPTY_STRING);
    setNativeFee('');
    setForeignFeePerByte('');
    setSearchParams({});
  };

  const sendFeeInputValue = chain.isNative ? nativeFee : foreignFeePerByte;
  const sendFeeLabel = chain.isNative
    ? t('send_dialog.optional_custom_fee', { coin: chain.ticker })
    : t('send_dialog.optional_fee_per_byte', { coin: chain.ticker });
  const setSendFeeInputValue = chain.isNative
    ? setNativeFee
    : setForeignFeePerByte;
  const canUseForeignSendMax = !chain.isNative && chain.coinEnum !== 'ARRR';
  const amountIsValid =
    canUseForeignSendMax && sendMax
      ? true
      : isPositiveDecimal(amount, chain.decimalPlaces);
  const recipientIsValid = isValidRecipient(recipient);
  const foreignFeeIsValid =
    chain.isNative ||
    chain.coinEnum === 'ARRR' ||
    isOptionalPositiveDecimal(foreignFeePerByte, 8);
  const canConfirmSend =
    !sending && amountIsValid && recipientIsValid && foreignFeeIsValid;
  const showAmountError = amount !== '' && !amountIsValid;
  const showRecipientError = recipient !== '' && !recipientIsValid;
  const showFeeError =
    !chain.isNative &&
    chain.coinEnum !== 'ARRR' &&
    foreignFeePerByte !== '' &&
    !foreignFeeIsValid;

  const handleCopyHash = (i: number, hash: string) => {
    const finish = () => {
      setCopiedHash(i);
      setTimeout(() => setCopiedHash(null), 2000);
    };
    navigator.clipboard
      .writeText(hash)
      .then(finish)
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = hash;
        el.style.cssText = 'position:fixed;top:-9999px';
        document.body.appendChild(el);
        el.focus();
        el.select();
        try {
          document.execCommand('copy');
        } catch {
          /* */
        }
        document.body.removeChild(el);
        finish();
      });
  };

  const handleToggleExpand = useCallback((i: number) => {
    setExpandedTx((prev) => (prev === i ? null : i));
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isClassic ? c.frameBg : c.bg }}>
      {/* ── sticky sub-header ── */}
      <Box
        sx={{
          position: 'sticky',
          top: `var(--wallet-top-bar-height, ${tokens.spacing.topBarHeight}px)`,
          zIndex: 90,
          bgcolor: c.surface,
          borderBottom: `${
            isClassic
              ? tokens.shape.classicBorderWidth
              : tokens.shape.borderWidth
          } solid ${isClassic ? c.border : c.borderLight}`,
          boxShadow: isClassic ? c.topBarShadow : 'none',
          display: 'flex',
          alignItems: 'center',
          px: { xs: isClassic ? 1.5 : 3, sm: 3 },
          py: isClassic ? 1 : 0,
          minHeight: tokens.spacing.topBarHeight,
          gap: { xs: 1, sm: 2 },
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
          size="small"
          sx={{ borderRadius: 0, color: c.textPrimary }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        {coinImageUrl && (
          <Box
            component="img"
            src={coinImageUrl}
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
        {!chain.isNative && !isARRR && (
          <Tooltip title="ElectrumX servers">
            <IconButton
              size="small"
              onClick={openForeignServerDialog}
              sx={{ borderRadius: 0, color: c.textSecondary }}
            >
              <DnsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip
          title={!canSend ? 'Sending requires a local node' : ''}
          disableHoverListener={canSend}
        >
          <span>
            <Button
              variant="contained"
              size="small"
              endIcon={<SendIcon sx={{ fontSize: '1rem !important' }} />}
              onClick={openSend}
              disableElevation
              disabled={(isARRR && !arrrSynced) || !canSend}
              sx={{
                bgcolor: c.accent,
                color: c.accentText,
                '&:hover': { bgcolor: c.accentHover },
                '&.Mui-disabled': { opacity: 0.4 },
                borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : '50px',
                px: 2.5,
                letterSpacing: isClassic ? 0 : '0.06em',
                fontWeight: tokens.typography.weightBold,
                fontSize: '0.75rem',
              }}
            >
              Send
            </Button>
          </span>
        </Tooltip>
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
        {!walletAvailable ? (
          <Box
            sx={{
              border: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              bgcolor: c.surface,
              boxShadow: c.shadowCard,
              p: { xs: 4, md: 6 },
              textAlign: 'center',
              color: c.textSecondary,
              fontSize: '0.875rem',
              lineHeight: 1.6,
            }}
          >
            Wallet features are not available on a public node.
            <br />
            Connect to a local Qortium node to view balances and transactions.
          </Box>
        ) : isARRR && !arrrSynced ? (
          /* ── ARRR initialization overlay ── */
          <Box
            sx={{
              border: `${
                isClassic
                  ? tokens.shape.classicBorderWidth
                  : tokens.shape.borderWidth
              } solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              bgcolor: c.surface,
              boxShadow: c.shadowCard,
              p: { xs: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 3,
            }}
          >
            {coinImageUrl ? (
              <Box
                component="img"
                src={coinImageUrl}
                alt="ARRR"
                sx={{
                  height: 56,
                  width: 56,
                  objectFit: 'contain',
                  opacity: arrrSyncFailed ? 0.35 : 0.75,
                }}
              />
            ) : (
              <Box
                sx={{
                  height: 56,
                  width: 56,
                  borderRadius: '50%',
                  bgcolor: 'rgba(128,128,128,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: tokens.typography.weightBold,
                  color: 'rgba(128,128,128,0.5)',
                  opacity: arrrSyncFailed ? 0.35 : 0.75,
                }}
              >
                A
              </Box>
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
                    borderRadius: isClassic
                      ? `${tokens.shape.radiusMd}px`
                      : '50px',
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
                      borderRadius: isClassic
                        ? `${tokens.shape.radiusMd}px`
                        : '50px',
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
                border: `${
                  isClassic
                    ? tokens.shape.classicBorderWidth
                    : tokens.shape.borderWidth
                } solid ${isClassic ? c.border : c.borderLight}`,
                borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px ${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px 0 0`,
                bgcolor: c.surface,
                boxShadow: c.shadowCard,
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
                {coinImageUrl ? (
                  <Box
                    component="img"
                    src={coinImageUrl}
                    alt={chain.ticker}
                    sx={{ height: 56, width: 56, objectFit: 'contain', mb: 2 }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 56,
                      width: 56,
                      borderRadius: '50%',
                      bgcolor: 'rgba(128,128,128,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: tokens.typography.weightBold,
                      color: 'rgba(128,128,128,0.5)',
                      mb: 2,
                    }}
                  >
                    {chain.ticker[0]}
                  </Box>
                )}
                {loadingBalance ? (
                  <Skeleton width={220} height={64} sx={{ mx: 'auto' }} />
                ) : (
                  <>
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
                    {pricePerUnit != null && (
                      <Box
                        sx={{
                          mt: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        {balance != null && parseFloat(balance) > 0 && (
                          <Box
                            sx={{
                              fontSize: '1.1rem',
                              fontWeight: tokens.typography.weightBold,
                              color: c.textPrimary,
                            }}
                          >
                            {formatFiat(
                              parseFloat(balance) * pricePerUnit,
                              currency
                            )}
                          </Box>
                        )}
                        <Box
                          sx={{
                            fontSize: '0.78rem',
                            color: c.textSecondary,
                            letterSpacing: '0.02em',
                          }}
                        >
                          1 {chain.ticker} ={' '}
                          {formatFiat(pricePerUnit, currency)}
                        </Box>
                      </Box>
                    )}
                  </>
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
                border: `${
                  isClassic
                    ? tokens.shape.classicBorderWidth
                    : tokens.shape.borderWidth
                } solid ${isClassic ? c.border : c.borderLight}`,
                borderTop: 'none',
                borderRadius: `0 0 ${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px ${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
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
                  fontFamily: c.monoFontFamily,
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
                border: `${
                  isClassic
                    ? tokens.shape.classicBorderWidth
                    : tokens.shape.borderWidth
                } solid ${isClassic ? c.border : c.borderLight}`,
                borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
                overflow: 'hidden',
                boxShadow: c.shadowCard,
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
                  />
                ))
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
            maxWidth: isClassic ? c.layoutMaxWidth : undefined,
            border: `${
              isClassic
                ? tokens.shape.classicBorderWidth
                : tokens.shape.borderWidth
            } solid ${isClassic ? c.border : c.borderLight}`,
            borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : 0,
            bgcolor: c.surface,
            boxShadow: isClassic ? c.shadowModal : undefined,
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
              borderBottom: `${
                isClassic
                  ? tokens.shape.classicBorderWidth
                  : tokens.shape.borderWidth
              } solid ${isClassic ? c.border : c.borderLight}`,
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
                  {t('send_dialog.transaction_sent')}
                </Typography>
                {sendResponse?.prepared && (
                  <PreparedTransactionPreview
                    chain={chain}
                    prepared={sendResponse.prepared}
                  />
                )}
              </Box>
            ) : sendResult === 'error' ? (
              <Box sx={{ textAlign: 'center', py: 3, color: c.error }}>
                <Typography sx={{ fontWeight: tokens.typography.weightBold }}>
                  {t('send_dialog.send_failed')}
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
                  {t('send_dialog.balance')}{' '}
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
                    decimalScale={chain.decimalPlaces}
                    value={amount}
                    allowNegative={false}
                    customInput={TextField as React.ComponentType<any>}
                    valueIsNumericString
                    label={t('send_dialog.amount_label', {
                      coin: chain.ticker,
                    })}
                    fullWidth
                    onValueChange={(v) => setAmount(v.value)}
                    disabled={sending || (canUseForeignSendMax && sendMax)}
                    error={showAmountError}
                    helperText={
                      showAmountError
                        ? t('send_dialog.amount_invalid', {
                            decimals: chain.decimalPlaces,
                          })
                        : undefined
                    }
                  />
                  {chain.isNative && (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={sending || !balance}
                      onClick={() => {
                        const bal = parseFloat(balance ?? '0');
                        const feeVal = parseFloat(nativeFee || '0');
                        const factor = Math.pow(10, chain.decimalPlaces);
                        setAmount(
                          String(
                            Math.max(
                              0,
                              Math.floor((bal - feeVal) * factor) / factor
                            )
                          )
                        );
                      }}
                      sx={{
                        mt: '8px',
                        flexShrink: 0,
                        borderRadius: isClassic
                          ? `${tokens.shape.radiusMd}px`
                          : '50px',
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
                  )}
                </Box>

                {canUseForeignSendMax && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={sendMax}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSendMax(checked);
                          if (checked) setAmount('');
                        }}
                        disabled={sending}
                      />
                    }
                    label={
                      <Box>
                        <Box
                          sx={{
                            fontSize: '0.85rem',
                            fontWeight: tokens.typography.weightBold,
                            color: c.textPrimary,
                          }}
                        >
                          {t('action.send_max')}
                        </Box>
                        <Box
                          sx={{
                            fontSize: '0.72rem',
                            color: c.textSecondary,
                          }}
                        >
                          {t('max_sendable')} {balance ?? '—'} {chain.ticker}
                        </Box>
                      </Box>
                    }
                    sx={{ alignItems: 'center', m: 0 }}
                  />
                )}

                <TextField
                  label={t('send_dialog.recipient_address')}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                  fullWidth
                  disabled={sending}
                  error={showRecipientError}
                  helperText={
                    showRecipientError
                      ? t('send_dialog.recipient_invalid')
                      : undefined
                  }
                />

                {!chain.isNative && (
                  <TextField
                    label={sendFeeLabel}
                    value={feeLoading ? 'Loading…' : sendFeeInputValue}
                    onChange={(e) => setSendFeeInputValue(e.target.value)}
                    fullWidth
                    disabled={sending || feeLoading}
                    type={feeLoading ? 'text' : 'number'}
                    inputProps={{ step: 'any', min: 0 }}
                    error={showFeeError}
                    helperText={
                      showFeeError
                        ? t('send_dialog.fee_per_byte_invalid')
                        : chain.coinEnum === 'ARRR'
                          ? t('send_dialog.arrr_fixed_fee')
                          : !feeLoading && !foreignFeePerByte
                            ? t('send_dialog.fee_lookup_unavailable')
                            : undefined
                    }
                  />
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSend}
                  disabled={!canConfirmSend}
                  disableElevation
                  sx={{
                    bgcolor: c.accent,
                    color: c.accentText,
                    '&:hover': { bgcolor: c.accentHover },
                    '&.Mui-disabled': { bgcolor: c.borderLight },
                    borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : 0,
                    py: 1.5,
                  }}
                >
                  {sending ? (
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                  ) : (
                    t('send_dialog.confirm_send')
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
              maxWidth: isClassic ? c.layoutMaxWidth : undefined,
              border: `${
                isClassic
                  ? tokens.shape.classicBorderWidth
                  : tokens.shape.borderWidth
              } solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : 0,
              bgcolor: c.surface,
              boxShadow: isClassic ? c.shadowModal : undefined,
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
                borderBottom: `${
                  isClassic
                    ? tokens.shape.classicBorderWidth
                    : tokens.shape.borderWidth
                } solid ${isClassic ? c.border : c.borderLight}`,
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
                      ? `1px solid ${isClassic ? c.border : c.borderLight}`
                      : 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isClassic ? c.controlHover : c.borderLight,
                  },
                  transition: 'background-color 0.12s ease',
                }}
              >
                <Box
                  sx={{
                    fontFamily: c.monoFontFamily,
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
                    {String(server.connectionType)}
                  </Box>
                )}
              </Box>
            ))}
          </DialogContent>
        </Dialog>
      )}

      {/* ── ElectrumX server selection dialog (non-ARRR foreign coins) ── */}
      {!chain.isNative && !isARRR && (
        <Dialog
          open={foreignServerOpen}
          onClose={() => setForeignServerOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              maxWidth: isClassic ? c.layoutMaxWidth : undefined,
              border: `${
                isClassic
                  ? tokens.shape.classicBorderWidth
                  : tokens.shape.borderWidth
              } solid ${isClassic ? c.border : c.borderLight}`,
              borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : 0,
              bgcolor: c.surface,
              boxShadow: isClassic ? c.shadowModal : undefined,
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
                borderBottom: `${
                  isClassic
                    ? tokens.shape.classicBorderWidth
                    : tokens.shape.borderWidth
                } solid ${isClassic ? c.border : c.borderLight}`,
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
                {chain.ticker} ElectrumX Servers
              </Box>
              <IconButton
                size="small"
                onClick={() => setForeignServerOpen(false)}
                sx={{ borderRadius: 0 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {foreignServerLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: c.accent }} />
              </Box>
            ) : foreignServers.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  color: c.textSecondary,
                  fontSize: '0.85rem',
                }}
              >
                No servers available
              </Box>
            ) : (
              foreignServers.map((server, i) => (
                <Box
                  key={i}
                  onClick={() => handleForeignServerChange(server)}
                  sx={{
                    px: 3,
                    py: 1.75,
                    borderBottom:
                      i < foreignServers.length - 1
                        ? `1px solid ${isClassic ? c.border : c.borderLight}`
                        : 'none',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isClassic ? c.controlHover : c.borderLight,
                    },
                    transition: 'background-color 0.12s ease',
                  }}
                >
                  <Box
                    sx={{
                      fontFamily: c.monoFontFamily,
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
                      {String(server.connectionType)}
                    </Box>
                  )}
                </Box>
              ))
            )}
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
