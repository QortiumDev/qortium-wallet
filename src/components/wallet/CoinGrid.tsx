import { useEffect, useRef, useState, useMemo } from 'react';
import { Box, IconButton, Skeleton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { requestWithTimeout } from '../../common/functions';
import { tokens } from '../../theme/tokens';
import { useColors } from '../../theme/ColorTokensContext';
import type { ChainConfig } from '../../config/chains';
import { sortModeAtom, customOrderAtom, tileSizeAtom } from '../../state/global/system';

// Min tile width in px per zoom level — CSS auto-fill guarantees each level is visually distinct
const TILE_MIN_PX: Record<number, number> = {
  1: 220,
  2: 170,
  3: 130,
  4: 95,
  5: 65,
  6: 50,
  7: 38,
};

const COIN_ICONS: Record<string, string> = {};

function loadIcons() {
  const modules = import.meta.glob('../../assets/*.{svg,png}', { eager: true, query: '?url', import: 'default' });
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split('/').pop()?.replace(/\.(svg|png)$/, '').toUpperCase();
    if (name) COIN_ICONS[name] = url as string;
  }
}
loadIcons();

interface BlockProps {
  chain: ChainConfig;
  balance: string | null;
  loading: boolean;
  tileSize: number;
  dragListeners?: Record<string, unknown>;
  isDragging?: boolean;
}

function CoinBlock({ chain, balance, loading, tileSize, dragListeners, isDragging }: BlockProps) {
  const c = useColors();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fetchedRef = useRef(false);
  const iconSrc = COIN_ICONS[chain.key];

  const handleMouseEnter = () => {
    setHovered(true);
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      qortalRequest({ action: 'GET_USER_WALLET', coin: chain.coinEnum })
        .then((res: any) => { if (res?.address) setAddress(res.address); })
        .catch(() => {});
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/${chain.route}?send=true`);
  };

  return (
    <Box
      {...(dragListeners as any)}
      onClick={() => !isDragging && navigate(`/${chain.route}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      sx={{
        aspectRatio: '1 / 1',
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        borderRadius: `${tokens.shape.radius}px`,
        bgcolor: hovered ? c.accent : c.surface,
        cursor: dragListeners ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        p: 2,
        position: 'relative',
        transition: isDragging ? 'none' : 'background-color 0.15s ease, box-shadow 0.15s ease',
        userSelect: 'none',
        boxShadow: isDragging
          ? '0 8px 28px rgba(45,58,74,0.35)'
          : hovered
          ? '0 4px 16px rgba(45,58,74,0.22)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      {/* Testnet badge */}
      {chain.activeNetwork !== 'MAIN' && (
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            fontSize: '0.5rem',
            fontWeight: tokens.typography.weightBold,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            px: 0.75,
            py: 0.25,
            borderRadius: '3px',
            bgcolor: hovered ? 'rgba(255,255,255,0.2)' : c.error,
            color: hovered ? c.accentText : '#fff',
            lineHeight: 1.4,
          }}
        >
          {chain.activeNetwork.toLowerCase()}
        </Box>
      )}

      {/* Logo / action zone */}
      <Box sx={{ position: 'relative', width: '44%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {iconSrc && (
          <Box
            component="img"
            src={iconSrc}
            alt={chain.ticker}
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: hovered ? 0 : 1,
              transition: 'opacity 0.15s ease',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          <Tooltip title={copied ? 'Copied!' : 'Copy address'} placement="top">
            <IconButton
              size="small"
              onClick={handleCopy}
              disableRipple={!address}
              sx={{
                color: c.accentText,
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: `${tokens.shape.radius / 2}px`,
                p: 0.75,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Send" placement="top">
            <IconButton
              size="small"
              onClick={handleSend}
              sx={{
                color: c.accentText,
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: `${tokens.shape.radius / 2}px`,
                p: 0.75,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              <SendIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Ticker + balance + address */}
      <Box sx={{ textAlign: 'center', width: '100%', overflow: 'hidden' }}>
        <Box
          sx={{
            fontSize: '0.65rem',
            fontWeight: tokens.typography.weightBold,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: hovered ? c.accentText : c.textSecondary,
            transition: 'color 0.15s ease',
          }}
        >
          {hovered ? chain.name : chain.ticker}
        </Box>
        <Box
          sx={{
            fontSize: '0.9rem',
            fontWeight: tokens.typography.weightBold,
            color: hovered ? c.accentText : c.textPrimary,
            transition: 'color 0.15s ease',
            mt: 0.25,
          }}
        >
          {loading
            ? <Skeleton width={60} sx={{ mx: 'auto', bgcolor: hovered ? 'rgba(255,255,255,0.2)' : undefined }} />
            : balance !== null ? balance : '—'}
        </Box>
        {tileSize <= 4 && (
          <Box
            sx={{
              fontFamily: 'monospace',
              fontSize: tileSize <= 2 ? '0.55rem' : '0.6rem',
              color: 'rgba(255,255,255,0.75)',
              mt: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              px: 0.5,
              opacity: hovered && address ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            {address
              ? address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-5)}` : address
              : ' '}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SortableCoinBlock({
  chain,
  balance,
  loading,
  tileSize,
  isCustomMode,
}: {
  chain: ChainConfig;
  balance: string | null;
  loading: boolean;
  tileSize: number;
  isCustomMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chain.key });

  return (
    <Box
      ref={setNodeRef}
      {...(attributes as any)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : (transition ?? undefined),
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
    >
      <CoinBlock
        chain={chain}
        balance={balance}
        loading={loading}
        tileSize={tileSize}
        dragListeners={isCustomMode ? (listeners as Record<string, unknown>) : undefined}
        isDragging={isDragging}
      />
    </Box>
  );
}

export function CoinGrid() {
  const chains = useSupportedChains();
  const [balances, setBalances] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const [sortMode] = useAtom(sortModeAtom);
  const [customOrder, setCustomOrder] = useAtom(customOrderAtom);
  const [tileSize] = useAtom(tileSizeAtom);

  // Merge newly discovered chains into the persisted order; remove any that no longer exist
  useEffect(() => {
    const chainKeys = chains.map((c) => c.key);
    setCustomOrder((prev: string[]) => {
      const filtered = prev.filter((k: string) => chainKeys.includes(k));
      const added = chainKeys.filter((k: string) => !prev.includes(k));
      const merged = [...filtered, ...added];
      if (merged.join(',') === prev.join(',')) return prev;
      return merged;
    });
  }, [chains]);

  const sortedChains = useMemo(() => {
    const arr = [...chains];
    if (sortMode === 'name-asc') return arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'name-desc') return arr.sort((a, b) => b.name.localeCompare(a.name));
    if (sortMode === 'balance-asc' || sortMode === 'balance-desc') {
      const dir = sortMode === 'balance-asc' ? 1 : -1;
      return arr.sort((a, b) => {
        const aLoading = loading[a.key] !== false;
        const bLoading = loading[b.key] !== false;
        if (aLoading && bLoading) return 0;
        if (aLoading) return 1;
        if (bLoading) return -1;
        const ba = balances[a.key];
        const bb = balances[b.key];
        if (ba === null && bb === null) return 0;
        if (ba === null) return 1;
        if (bb === null) return -1;
        return dir * (parseFloat(ba) - parseFloat(bb));
      });
    }
    // custom: respect persisted order
    return arr.sort((a, b) => {
      const ai = customOrder.indexOf(a.key);
      const bi = customOrder.indexOf(b.key);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [sortMode, customOrder, chains, balances, loading]);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedChains.findIndex((c) => c.key === active.id);
    const newIndex = sortedChains.findIndex((c) => c.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setCustomOrder(arrayMove(sortedChains.map((c) => c.key), oldIndex, newIndex));
  };

  // Balance loading with concurrency limit
  useEffect(() => {
    const init: Record<string, boolean> = {};
    chains.forEach((c) => { init[c.key] = true; });
    setLoading(init);

    let slots = 2;
    const waiting: Array<() => void> = [];
    const acquire = () => new Promise<void>((res) => {
      if (slots > 0) { slots--; res(); }
      else waiting.push(res);
    });
    const release = () => {
      const next = waiting.shift();
      if (next) next();
      else slots++;
    };

    chains.forEach(async (chain) => {
      await acquire();
      const MAX_ATTEMPTS = 2;
      const RETRY_DELAY = 1200;
      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY));
          try {
            let balance: string;
            if (chain.isNative) {
              const wallet = await qortalRequest({ action: 'GET_USER_WALLET', coin: chain.coinEnum } as any);
              if (!wallet?.address) throw new Error('no address');
              const res = await fetch(`/addresses/balance/${encodeURIComponent(wallet.address)}`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              balance = String(await res.json() ?? 0);
            } else {
              const res = await requestWithTimeout(
                { action: 'GET_WALLET_BALANCE', coin: chain.coinEnum },
                30000
              );
              if (res?.error) throw new Error(res.error);
              balance = res ?? '0';
            }
            setBalances((prev) => ({ ...prev, [chain.key]: balance }));
            setLoading((prev) => ({ ...prev, [chain.key]: false }));
            return;
          } catch { /* retry */ }
        }
        setBalances((prev) => ({ ...prev, [chain.key]: null }));
        setLoading((prev) => ({ ...prev, [chain.key]: false }));
      } finally {
        release();
      }
    });
  }, [chains]);

  const isCustom = sortMode === 'custom';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedChains.map((c) => c.key)} strategy={rectSortingStrategy}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN_PX[tileSize] ?? 130}px, 1fr))`,
              gap: 1.5,
            }}
          >
            {sortedChains.map((chain) => (
              <SortableCoinBlock
                key={chain.key}
                chain={chain}
                balance={balances[chain.key] ?? null}
                loading={loading[chain.key] ?? true}
                tileSize={tileSize}
                isCustomMode={isCustom}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
}
