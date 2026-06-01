import { useState } from 'react';
import { Box, CircularProgress, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SortIcon from '@mui/icons-material/Sort';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { useAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { EnumTheme, themeAtom, sortModeAtom, tileSizeAtom, type SortMode } from '../../state/global/system';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useSupportedChains } from '../../hooks/useSupportedChains';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'custom',        label: 'Custom order' },
  { value: 'name-asc',     label: 'Name A → Z' },
  { value: 'name-desc',    label: 'Name Z → A' },
  { value: 'balance-desc', label: 'Balance high → low' },
  { value: 'balance-asc',  label: 'Balance low → high' },
];

export function TopBar() {
  const c = useColors();
  const chains = useSupportedChains();
  const [theme, setTheme] = useAtom(themeAtom);
  const [sortMode, setSortMode] = useAtom(sortModeAtom);
  const [tileSize, setTileSize] = useAtom(tileSizeAtom);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'done'>('idle');
  const { pathname } = useLocation();
  const isDark = theme === EnumTheme.DARK;
  const isGrid = pathname === '/';

  const handleCopyAll = async () => {
    if (copyState !== 'idle') return;
    setCopyState('loading');
    try {
      const lines = await Promise.all(
        chains.map(async (chain) => {
          try {
            const res = await qortalRequest({ action: 'GET_USER_WALLET', coin: chain.coinEnum } as any);
            return res?.address ? `${chain.ticker} - ${res.address}` : null;
          } catch {
            return null;
          }
        })
      );
      const text = lines.filter(Boolean).join('\n');
      await navigator.clipboard.writeText(text);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  };

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: tokens.spacing.topBarHeight,
        borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        bgcolor: c.surface,
        display: 'flex',
        alignItems: 'center',
        px: 3,
        gap: 1,
      }}
    >
      <Box
        sx={{
          fontWeight: tokens.typography.weightBlack,
          fontSize: '1rem',
          letterSpacing: { xs: '0.08em', sm: '0.18em' },
          textTransform: 'uppercase',
          color: c.textPrimary,
          flexGrow: 1,
          userSelect: 'none',
        }}
      >
        Walletium
      </Box>

      {/* Copy all addresses */}
      <Tooltip title={copyState === 'done' ? 'Copied!' : 'Copy all addresses'} placement="bottom">
        <IconButton
          size="small"
          onClick={handleCopyAll}
          disabled={copyState === 'loading'}
          sx={{
            color: copyState === 'done' ? c.accent : c.textSecondary,
            borderRadius: `${tokens.shape.radius}px`,
            '&:hover': { color: c.accent },
          }}
          aria-label="copy all addresses"
        >
          {copyState === 'loading'
            ? <CircularProgress size={16} sx={{ color: c.textSecondary }} />
            : copyState === 'done'
            ? <DoneAllIcon fontSize="small" />
            : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {/* Zoom + Sort (grid page only) */}
      {isGrid && (
        <>
          <Tooltip title="Zoom out" placement="bottom">
            <span>
              <IconButton
                size="small"
                onClick={() => setTileSize((s) => Math.min(s + 1, 7))}
                disabled={tileSize >= 7}
                sx={{ color: c.textSecondary, borderRadius: `${tokens.shape.radius}px`, '&:hover': { color: c.accent }, '&.Mui-disabled': { opacity: 0.3 } }}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Zoom in" placement="bottom">
            <span>
              <IconButton
                size="small"
                onClick={() => setTileSize((s) => Math.max(s - 1, 1))}
                disabled={tileSize <= 1}
                sx={{ color: c.textSecondary, borderRadius: `${tokens.shape.radius}px`, '&:hover': { color: c.accent }, '&.Mui-disabled': { opacity: 0.3 } }}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Sort" placement="bottom">
            <IconButton
              size="small"
              onClick={(e) => setSortAnchor(e.currentTarget)}
              sx={{
                color: sortAnchor || sortMode !== 'custom' ? c.accent : c.textSecondary,
                borderRadius: `${tokens.shape.radius}px`,
                '&:hover': { color: c.accent },
              }}
              aria-label="sort coins"
            >
              <SortIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: c.surface,
                  border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                  borderRadius: `${tokens.shape.radius}px`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                  minWidth: 190,
                },
              },
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                selected={sortMode === opt.value}
                onClick={() => { setSortMode(opt.value); setSortAnchor(null); }}
                sx={{
                  fontSize: '0.8rem',
                  letterSpacing: '0.04em',
                  color: sortMode === opt.value ? c.accent : c.textPrimary,
                  fontWeight: sortMode === opt.value ? tokens.typography.weightBold : 400,
                  '&.Mui-selected': { bgcolor: `${c.accent}14` },
                  '&.Mui-selected:hover': { bgcolor: `${c.accent}20` },
                  '&:hover': { bgcolor: `${c.accent}0c` },
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      <Tooltip title={isDark ? 'Light mode' : 'Dark mode'} placement="bottom">
        <IconButton
          size="small"
          onClick={() => setTheme(isDark ? EnumTheme.LIGHT : EnumTheme.DARK)}
          sx={{ color: c.textSecondary, borderRadius: `${tokens.shape.radius}px`, '&:hover': { color: c.textPrimary } }}
          aria-label="toggle dark mode"
        >
          {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Settings" placement="bottom">
        <IconButton
          size="small"
          sx={{ color: c.textSecondary, borderRadius: `${tokens.shape.radius}px`, opacity: 0.4, cursor: 'default' }}
          aria-label="settings"
          disableRipple
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
