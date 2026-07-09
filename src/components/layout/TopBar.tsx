import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SortIcon from '@mui/icons-material/Sort';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveAlt1Icon from '@mui/icons-material/PersonRemoveAlt1';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAtom, useAtomValue } from 'jotai';
import { useLocation } from 'react-router-dom';
import {
  EnumTheme,
  themeAtom,
  uiStyleAtom,
  sortModeAtom,
  tileSizeAtom,
  currencyAtom,
  portfolioFiatAtom,
  FIAT_CURRENCIES,
  type SortMode,
} from '../../state/global/system';
import { formatFiat } from '../../common/functions';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { RatingControl } from './RatingControl';

const APP_QDN_NAME = 'Wallet';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'custom', label: 'Custom order' },
  { value: 'name-asc', label: 'Name A → Z' },
  { value: 'name-desc', label: 'Name Z → A' },
  { value: 'balance-desc', label: 'Balance high → low' },
  { value: 'balance-asc', label: 'Balance low → high' },
];

export function TopBar() {
  const c = useColors();
  const { chains, status } = useSupportedChains();
  const [theme, setTheme] = useAtom(themeAtom);
  const uiStyle = useAtomValue(uiStyleAtom);
  const [sortMode, setSortMode] = useAtom(sortModeAtom);
  const [tileSize, setTileSize] = useAtom(tileSizeAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const portfolioFiat = useAtomValue(portfolioFiatAtom);
  const headerRef = useRef<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [currencyAnchor, setCurrencyAnchor] = useState<null | HTMLElement>(
    null
  );
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'done'>(
    'idle'
  );
  const { pathname } = useLocation();
  const isDark = theme === EnumTheme.DARK;
  const isClassic = uiStyle === 'classic';
  const isGrid = pathname === '/';
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await qdnRequest({
          action: 'GET_LIST',
          list_name: 'followedNames',
        } as any);
        setIsFollowed(Array.isArray(list) && list.includes(APP_QDN_NAME));
      } catch {
        // Follow-list state is optional chrome; ignore unavailable list APIs.
      }
    })();
  }, []);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => {
      document.documentElement.style.setProperty(
        '--wallet-top-bar-height',
        `${header.getBoundingClientRect().height}px`
      );
    };

    updateHeight();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isClassic, isGrid, status]);

  async function handleToggleFollow() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowed) {
        await qdnRequest({
          action: 'REMOVE_FROM_LIST',
          list_name: 'followedNames',
          items: [APP_QDN_NAME],
        } as any);
        setIsFollowed(false);
      } else {
        await qdnRequest({
          action: 'ADD_TO_LIST',
          list_name: 'followedNames',
          items: [APP_QDN_NAME],
        } as any);
        setIsFollowed(true);
      }
    } catch {
      // Follow/unfollow is best-effort; keep the current state if the request fails.
    }
    setFollowBusy(false);
  }

  function handleOpenHelp() {
    try {
      void qdnRequest({
        action: 'OPEN_NEW_TAB',
        address: `qdn://APP/Help/Help?new=${APP_QDN_NAME}`,
      } as any);
    } catch {
      // Help tab opening is optional and can fail outside Qortium Home.
    }
  }

  const handleCopyAll = async () => {
    if (copyState !== 'idle') return;
    setCopyState('loading');
    try {
      const lines = await Promise.all(
        chains.map(async (chain) => {
          try {
            const res = await qdnRequest(
              chain.isNative
                ? { action: 'GET_USER_WALLET', assetId: 0 }
                : { action: 'GET_USER_WALLET', coin: chain.coinEnum }
            );
            return res?.address ? `${chain.ticker} - ${res.address}` : null;
          } catch {
            return null;
          }
        })
      );
      const text = lines.filter(Boolean).join('\n');
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const el = document.createElement('textarea');
        el.value = text;
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
      }
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  };

  function handleToggleTheme() {
    const next = isDark ? EnumTheme.LIGHT : EnumTheme.DARK;
    setTheme(next);
    document.documentElement.dataset.theme =
      next === EnumTheme.DARK ? 'dark' : 'light';
    document.documentElement.style.colorScheme =
      next === EnumTheme.DARK ? 'dark' : 'light';
  }

  const buttonSx = {
    color: c.textSecondary,
    borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
    minWidth: 36,
    minHeight: 36,
    flexShrink: 0,
    transition: c.transitionControl,
    '&:hover': {
      color: c.accent,
      bgcolor: isClassic ? c.controlHover : 'transparent',
    },
    '&.Mui-disabled': { opacity: 0.3 },
  };

  return (
    <Box
      component="header"
      ref={headerRef}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        minHeight: isClassic ? 'auto' : tokens.spacing.topBarHeight,
        borderBottom: `${
          isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth
        } solid ${isClassic ? c.border : c.borderLight}`,
        boxShadow: isClassic ? c.topBarShadow : 'none',
        bgcolor: c.surface,
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'minmax(0, 1fr) auto',
        },
        alignItems: 'center',
        px: isClassic ? { xs: 1.25, sm: 1.75 } : 3,
        py: isClassic ? 1 : 0,
        gap: isClassic ? 1 : 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            fontWeight: tokens.typography.weightBlack,
            fontSize: '1rem',
            letterSpacing: { xs: '0.08em', sm: '0.18em' },
            textTransform: 'uppercase',
            color: c.textPrimary,
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          Wallet
        </Box>

        {status !== 'pending' && (
          <Tooltip
            title={
              status === 'live'
                ? `Node reported ${chains.length} wallets`
                : `Node unreachable — showing all ${chains.length} known coins`
            }
            placement="bottom"
          >
            <Box
              sx={{
                fontSize: '0.6rem',
                fontWeight: tokens.typography.weightBold,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                px: 0.75,
                py: 0.25,
                borderRadius: '4px',
                userSelect: 'none',
                cursor: 'default',
                border: `1px solid`,
                ...(status === 'live'
                  ? {
                      color: c.accent,
                      borderColor: `${c.accent}50`,
                      bgcolor: `${c.accent}14`,
                    }
                  : {
                      color: '#f59e0b',
                      borderColor: '#f59e0b50',
                      bgcolor: '#f59e0b14',
                    }),
              }}
            >
              {status === 'live'
                ? `${chains.length} live`
                : `${chains.length} fallback`}
            </Box>
          </Tooltip>
        )}

        {portfolioFiat != null && (
          <Tooltip title="Total portfolio value" placement="bottom">
            <Box
              sx={{
                fontSize: '0.85rem',
                fontWeight: tokens.typography.weightBold,
                color: c.textPrimary,
                letterSpacing: '0.02em',
                userSelect: 'none',
                cursor: 'default',
                pl: 0.5,
              }}
            >
              {formatFiat(portfolioFiat, currency)}
            </Box>
          </Tooltip>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          gap: isClassic ? 0.5 : 0.25,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        {/* Copy all addresses */}
        <Tooltip
          title={copyState === 'done' ? 'Copied!' : 'Copy all addresses'}
          placement="bottom"
        >
          <IconButton
            size="small"
            onClick={handleCopyAll}
            disabled={copyState === 'loading'}
            sx={{
              ...buttonSx,
              color: copyState === 'done' ? c.accent : c.textSecondary,
            }}
            aria-label="copy all addresses"
          >
            {copyState === 'loading' ? (
              <CircularProgress size={16} sx={{ color: c.textSecondary }} />
            ) : copyState === 'done' ? (
              <DoneAllIcon fontSize="small" />
            ) : (
              <ContentCopyIcon fontSize="small" />
            )}
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
                  sx={buttonSx}
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
                  sx={buttonSx}
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
                  ...buttonSx,
                  color:
                    sortAnchor || sortMode !== 'custom'
                      ? c.accent
                      : c.textSecondary,
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
                    border: `${
                      isClassic
                        ? tokens.shape.classicBorderWidth
                        : tokens.shape.borderWidth
                    } solid ${isClassic ? c.border : c.borderLight}`,
                    borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
                    boxShadow: isClassic
                      ? c.shadowPop
                      : '0 4px 20px rgba(0,0,0,0.14)',
                    minWidth: 190,
                  },
                },
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  selected={sortMode === opt.value}
                  onClick={() => {
                    setSortMode(opt.value);
                    setSortAnchor(null);
                  }}
                  sx={{
                    fontSize: '0.8rem',
                    letterSpacing: '0.04em',
                    color: sortMode === opt.value ? c.accent : c.textPrimary,
                    fontWeight:
                      sortMode === opt.value
                        ? tokens.typography.weightBold
                        : 400,
                    '&.Mui-selected': { bgcolor: c.accentSoft },
                    '&.Mui-selected:hover': { bgcolor: c.accentRing },
                    '&:hover': {
                      bgcolor: isClassic ? c.controlHover : `${c.accent}0c`,
                    },
                  }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Menu>

            <Tooltip title="Fiat currency" placement="bottom">
              <IconButton
                size="small"
                onClick={(e) => setCurrencyAnchor(e.currentTarget)}
                sx={{
                  ...buttonSx,
                  color: currencyAnchor ? c.accent : c.textSecondary,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  width: 28,
                  height: 28,
                }}
                aria-label="select fiat currency"
              >
                {currency.toUpperCase()}
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={currencyAnchor}
              open={Boolean(currencyAnchor)}
              onClose={() => setCurrencyAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: c.surface,
                    border: `${
                      isClassic
                        ? tokens.shape.classicBorderWidth
                        : tokens.shape.borderWidth
                    } solid ${isClassic ? c.border : c.borderLight}`,
                    borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
                    boxShadow: isClassic
                      ? c.shadowPop
                      : '0 4px 20px rgba(0,0,0,0.14)',
                    minWidth: 190,
                  },
                },
              }}
            >
              {FIAT_CURRENCIES.map((opt) => (
                <MenuItem
                  key={opt.code}
                  selected={currency === opt.code}
                  onClick={() => {
                    setCurrency(opt.code);
                    setCurrencyAnchor(null);
                  }}
                  sx={{
                    fontSize: '0.8rem',
                    letterSpacing: '0.04em',
                    color: currency === opt.code ? c.accent : c.textPrimary,
                    fontWeight:
                      currency === opt.code
                        ? tokens.typography.weightBold
                        : 400,
                    '&.Mui-selected': { bgcolor: c.accentSoft },
                    '&.Mui-selected:hover': { bgcolor: c.accentRing },
                    '&:hover': {
                      bgcolor: isClassic ? c.controlHover : `${c.accent}0c`,
                    },
                  }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        <RatingControl qdnName={APP_QDN_NAME} />

        <Tooltip
          title={isFollowed ? 'Stop following this app' : 'Follow this app'}
          placement="bottom"
        >
          <IconButton
            size="small"
            onClick={() => void handleToggleFollow()}
            disabled={followBusy}
            sx={{
              ...buttonSx,
              color: isFollowed ? c.accent : c.textSecondary,
            }}
            aria-label={
              isFollowed ? 'stop following this app' : 'follow this app'
            }
          >
            {isFollowed ? (
              <PersonRemoveAlt1Icon fontSize="small" />
            ) : (
              <PersonAddAlt1Icon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Help & Feedback" placement="bottom">
          <IconButton
            size="small"
            onClick={handleOpenHelp}
            sx={buttonSx}
            aria-label="help and feedback"
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={isDark ? 'Light mode' : 'Dark mode'} placement="bottom">
          <IconButton
            size="small"
            onClick={handleToggleTheme}
            sx={{
              ...buttonSx,
              color: c.textSecondary,
              '&:hover': {
                color: c.textPrimary,
                bgcolor: isClassic ? c.controlHover : 'transparent',
              },
            }}
            aria-label="toggle dark mode"
          >
            {isDark ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings" placement="bottom">
          <IconButton
            size="small"
            sx={{
              ...buttonSx,
              color: c.textSecondary,
              opacity: 0.4,
              cursor: 'default',
            }}
            aria-label="settings"
            disableRipple
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
