import { useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Skeleton,
  Tooltip,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SendIcon from '@mui/icons-material/Send';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import type { ChainConfig } from '../../config/chains';
import { uiStyleAtom } from '../../state/global/system';
import { useCoinImageUrl } from '../../hooks/useCoinImageUrl';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

interface CoinListRowProps {
  chain: ChainConfig;
  balance: string | null;
  canSend: boolean;
  loading: boolean;
  fiatDisplay?: string;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

function walletRequestForChain(chain: ChainConfig): QdnRequestOptions {
  return chain.isNative
    ? { action: 'GET_USER_WALLET', assetId: 0 }
    : { action: 'GET_USER_WALLET', coin: chain.coinEnum };
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const element = document.createElement('textarea');
    element.value = text;
    element.style.cssText = 'position:fixed;top:-9999px';
    document.body.appendChild(element);
    element.focus();
    element.select();
    try {
      document.execCommand('copy');
    } catch {
      // Clipboard access is best-effort in older hosts.
    }
    document.body.removeChild(element);
  }
}

export function CoinListRow({
  chain,
  balance,
  canSend,
  loading,
  fiatDisplay,
  dragHandleProps,
  isDragging,
}: CoinListRowProps) {
  const c = useColors();
  const isClassic = useAtomValue(uiStyleAtom) === 'classic';
  const navigate = useNavigate();
  const coinImageUrl = useCoinImageUrl(chain.ticker);
  const [address, setAddress] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'done'>(
    'idle'
  );

  const openWallet = () => {
    if (!isDragging) navigate(`/${chain.route}`);
  };

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (copyState === 'loading') return;

    setCopyState('loading');
    try {
      let walletAddress = address;
      if (!walletAddress) {
        const response = await qdnRequest(walletRequestForChain(chain));
        walletAddress = response?.address ?? null;
        if (walletAddress) setAddress(walletAddress);
      }
      if (!walletAddress) {
        setCopyState('idle');
        return;
      }
      await copyText(walletAddress);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  };

  const handleSend = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/${chain.route}?send=true`);
  };

  const actionButtonSx = {
    color: c.textSecondary,
    borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
    minWidth: 36,
    minHeight: 36,
    '&:hover': { color: c.accent, bgcolor: c.controlHover },
  };

  return (
    <Box
      data-testid={`coin-list-row-${chain.key}`}
      onClick={openWallet}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.75, sm: 1.5 },
        minHeight: 72,
        px: { xs: 1, sm: 1.5 },
        py: 1,
        border: `${
          isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth
        } solid ${isClassic ? c.border : c.borderLight}`,
        borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
        bgcolor: c.surface,
        boxShadow: isDragging ? c.shadowCardHover : c.shadowCard,
        opacity: isDragging ? 0.85 : 1,
        cursor: 'pointer',
        transition: isDragging
          ? 'none'
          : 'background-color 0.15s ease, box-shadow 0.15s ease',
        '&:hover': { bgcolor: c.surfaceAlt, boxShadow: c.shadowCardHover },
      }}
    >
      {dragHandleProps ? (
        <Tooltip title="Drag to reorder" placement="top">
          <IconButton
            {...dragHandleProps}
            size="small"
            onClick={(event) => event.stopPropagation()}
            aria-label={`reorder ${chain.ticker}`}
            sx={{
              ...actionButtonSx,
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Box sx={{ width: 36, flexShrink: 0 }} />
      )}

      {coinImageUrl ? (
        <Box
          component="img"
          src={coinImageUrl}
          alt=""
          sx={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
        />
      ) : (
        <Box
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: c.controlHover,
            color: c.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: tokens.typography.weightBold,
            flexShrink: 0,
          }}
        >
          {chain.ticker[0]}
        </Box>
      )}

      <Box sx={{ minWidth: 0, flex: '1 1 180px' }}>
        <Box
          sx={{
            color: c.textPrimary,
            fontWeight: tokens.typography.weightBold,
            fontSize: '0.9rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {chain.name}
        </Box>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}
        >
          <Box
            sx={{
              color: c.textSecondary,
              fontSize: '0.65rem',
              fontWeight: tokens.typography.weightBold,
              letterSpacing: '0.12em',
            }}
          >
            {chain.ticker}
          </Box>
          {chain.activeNetwork !== 'MAIN' && (
            <Box
              sx={{
                px: 0.6,
                py: 0.1,
                borderRadius: '3px',
                bgcolor: c.error,
                color: '#fff',
                fontSize: '0.5rem',
                fontWeight: tokens.typography.weightBold,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {chain.activeNetwork.toLowerCase()}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          width: { xs: 72, sm: 180 },
          minWidth: 0,
          flexShrink: 1,
          textAlign: 'end',
        }}
      >
        <Box
          title={balance ?? undefined}
          sx={{
            color: c.textPrimary,
            fontWeight: tokens.typography.weightBold,
            fontSize: '0.9rem',
            fontVariantNumeric: 'tabular-nums',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? (
            <Skeleton width={72} sx={{ ml: 'auto' }} />
          ) : balance !== null ? (
            balance
          ) : (
            '—'
          )}
        </Box>
        <Box
          sx={{
            minHeight: '1rem',
            color: c.textSecondary,
            fontSize: '0.65rem',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fiatDisplay ?? ''}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Tooltip title={copyState === 'done' ? 'Copied!' : 'Copy address'}>
          <IconButton
            size="small"
            onClick={(event) => void handleCopy(event)}
            disabled={copyState === 'loading'}
            aria-label={`copy ${chain.ticker} address`}
            sx={actionButtonSx}
          >
            {copyState === 'loading' ? (
              <CircularProgress size={16} sx={{ color: c.textSecondary }} />
            ) : copyState === 'done' ? (
              <CheckIcon fontSize="small" />
            ) : (
              <ContentCopyIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title={canSend ? 'Send' : 'Requires a local node'}>
          <span>
            <IconButton
              size="small"
              onClick={handleSend}
              disabled={!canSend}
              aria-label={`send ${chain.ticker}`}
              sx={actionButtonSx}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Open wallet">
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              openWallet();
            }}
            aria-label={`open ${chain.ticker} wallet`}
            sx={actionButtonSx}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
