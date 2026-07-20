import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveAlt1Icon from '@mui/icons-material/PersonRemoveAlt1';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { useAtom, useAtomValue } from 'jotai';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  uiStyleAtom,
  sortModeAtom,
  viewModeAtom,
  tileSizeAtom,
  currencyAtom,
  portfolioFiatAtom,
  hideZeroAtom,
  notificationsEnabledAtom,
  notificationsSupportedAtom,
  paymentNotificationRegistrationErrorAtom,
  paymentNotificationRegistrationStatusAtom,
  FIAT_CURRENCIES,
  type SortMode,
} from '../../state/global/system';
import { formatFiat } from '../../common/functions';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { RatingControl } from './RatingControl';
import { AppIcon, getOwnQdnName } from './AppIdentity';
import { PriceTicker } from './PriceTicker';

const APP_QDN_NAME = getOwnQdnName('Wallet');
const APP_QDN_IDENTIFIER = 'Wallet';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'custom', label: 'Custom order' },
  { value: 'name-asc', label: 'Name A → Z' },
  { value: 'name-desc', label: 'Name Z → A' },
  { value: 'balance-desc', label: 'Balance high → low' },
  { value: 'balance-asc', label: 'Balance low → high' },
];

const ZOOM_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'Largest' },
  { value: 2, label: 'Larger' },
  { value: 3, label: 'Large' },
  { value: 4, label: 'Medium' },
  { value: 5, label: 'Small' },
  { value: 6, label: 'Smaller' },
  { value: 7, label: 'Compact' },
  { value: 8, label: 'Tiny' },
  { value: 9, label: 'Smallest' },
];

export function TopBar() {
  const c = useColors();
  const { chains, status } = useSupportedChains();
  const uiStyle = useAtomValue(uiStyleAtom);
  const [sortMode, setSortMode] = useAtom(sortModeAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [tileSize, setTileSize] = useAtom(tileSizeAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const portfolioFiat = useAtomValue(portfolioFiatAtom);
  const prices = useMarketPrices();
  const [hideZero, setHideZero] = useAtom(hideZeroAtom);
  const [notificationsEnabled, setNotificationsEnabled] = useAtom(
    notificationsEnabledAtom
  );
  const notificationsSupported = useAtomValue(notificationsSupportedAtom);
  const notificationStatus = useAtomValue(
    paymentNotificationRegistrationStatusAtom
  );
  const [notificationError, setNotificationError] = useAtom(
    paymentNotificationRegistrationErrorAtom
  );
  const headerRef = useRef<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [zoomAnchor, setZoomAnchor] = useState<null | HTMLElement>(null);
  const [currencyAnchor, setCurrencyAnchor] = useState<null | HTMLElement>(
    null
  );
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'done'>(
    'idle'
  );
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isClassic = uiStyle === 'classic';
  const isPortfolioRoute = pathname === '/';
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [notificationConsentOpen, setNotificationConsentOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await qdnRequest({
          action: 'GET_LIST',
          listName: 'followedNames',
        });
        setIsFollowed(
          Array.isArray(list) && (list as string[]).includes(APP_QDN_NAME)
        );
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
  }, [isClassic, isPortfolioRoute, status]);

  async function handleToggleFollow() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowed) {
        await qdnRequest({
          action: 'REMOVE_FROM_LIST',
          listName: 'followedNames',
          items: [APP_QDN_NAME],
        });
        setIsFollowed(false);
      } else {
        await qdnRequest({
          action: 'ADD_TO_LIST',
          listName: 'followedNames',
          items: [APP_QDN_NAME],
        });
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

  function handleNotificationToggle() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      return;
    }

    setNotificationConsentOpen(true);
  }

  function enablePaymentNotifications() {
    setNotificationConsentOpen(false);
    setNotificationError(null);
    setNotificationsEnabled(true);
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

  const buttonSx = {
    color: c.textSecondary,
    borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    p: 0,
    flexShrink: 0,
    transition: c.transitionControl,
    '&:hover': {
      color: c.accent,
      bgcolor: isClassic ? c.controlHover : c.borderLight,
    },
    '&.Mui-disabled': { opacity: 0.3 },
  };

  const notificationsRegistered =
    notificationsEnabled && notificationStatus === 'registered';
  const notificationTooltip =
    notificationStatus === 'registering'
      ? 'Updating payment notifications…'
      : notificationStatus === 'error'
        ? `Payment notifications failed: ${notificationError ?? 'Unknown error'}`
        : notificationsRegistered
          ? 'Payment notifications on'
          : 'Payment notifications off';

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
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: c.textPrimary,
            cursor: 'pointer',
            '&:hover': { color: c.accent },
            transition: c.transitionControl,
            userSelect: 'none',
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <AppIcon qdnName={APP_QDN_NAME} />
          <Box
            sx={{
              fontWeight: tokens.typography.weightBlack,
              fontSize: '1rem',
              letterSpacing: { xs: '0.08em', sm: '0.18em' },
              textTransform: 'uppercase',
              color: 'inherit',
            }}
          >
            {APP_QDN_NAME}
          </Box>
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

        {/* Portfolio view selector */}
        {isPortfolioRoute && (
          <Box
            role="group"
            aria-label="portfolio view"
            sx={{
              display: 'flex',
              flexShrink: 0,
              border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
              borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              overflow: 'hidden',
            }}
          >
            <Tooltip title="Grid view" placement="bottom">
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                aria-label="grid view"
                aria-pressed={viewMode === 'grid'}
                sx={{
                  ...buttonSx,
                  minWidth: 40,
                  width: 40,
                  borderRadius: 0,
                  color: viewMode === 'grid' ? c.accent : c.textSecondary,
                  bgcolor: viewMode === 'grid' ? c.accentSoft : 'transparent',
                }}
              >
                <GridViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="List view" placement="bottom">
              <IconButton
                size="small"
                onClick={() => setViewMode('list')}
                aria-label="list view"
                aria-pressed={viewMode === 'list'}
                sx={{
                  ...buttonSx,
                  minWidth: 40,
                  width: 40,
                  borderRadius: 0,
                  borderInlineStart: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                  color: viewMode === 'list' ? c.accent : c.textSecondary,
                  bgcolor: viewMode === 'list' ? c.accentSoft : 'transparent',
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Zoom (portfolio grid view only) */}
        {isPortfolioRoute && viewMode === 'grid' && (
          <>
            <Tooltip title="Zoom" placement="bottom">
              <IconButton
                size="small"
                onClick={(e) => setZoomAnchor(e.currentTarget)}
                sx={{
                  ...buttonSx,
                  color: zoomAnchor ? c.accent : c.textSecondary,
                }}
                aria-label="select zoom level"
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={zoomAnchor}
              open={Boolean(zoomAnchor)}
              onClose={() => setZoomAnchor(null)}
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
              {ZOOM_LEVELS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  selected={tileSize === opt.value}
                  onClick={() => {
                    setTileSize(opt.value);
                    setZoomAnchor(null);
                  }}
                  sx={{
                    fontSize: '0.8rem',
                    letterSpacing: '0.04em',
                    color: tileSize === opt.value ? c.accent : c.textPrimary,
                    fontWeight:
                      tileSize === opt.value
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

        {/* Transaction history */}
        <Tooltip title="All transactions" placement="bottom">
          <IconButton
            size="small"
            onClick={() => navigate(pathname === '/history' ? '/' : '/history')}
            sx={{
              ...buttonSx,
              color: pathname === '/history' ? c.accent : c.textSecondary,
            }}
            aria-label="all transactions"
          >
            <ReceiptLongIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Sort (grid page only) */}
        {isPortfolioRoute && (
          <>
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

            <Tooltip
              title={hideZero ? 'Show all coins' : 'Hide zero balances'}
              placement="bottom"
            >
              <IconButton
                size="small"
                onClick={() => setHideZero((h) => !h)}
                sx={{
                  ...buttonSx,
                  color: hideZero ? c.accent : c.textSecondary,
                }}
                aria-label="hide zero balances"
              >
                <FilterAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>

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
                    flexShrink: 0,
                  }}
                >
                  {formatFiat(portfolioFiat, currency)}
                </Box>
              </Tooltip>
            )}

            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flex: '1 1 160px',
                minWidth: 0,
              }}
            >
              <PriceTicker
                chains={chains}
                prices={prices}
                currency={currency}
              />
            </Box>
          </>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          gap: isClassic ? 0.5 : 0.25,
          minWidth: 0,
        }}
      >
        {notificationsSupported && (
          <Tooltip title={notificationTooltip} placement="bottom">
            <span style={{ display: 'inline-flex' }}>
              <IconButton
                size="small"
                onClick={handleNotificationToggle}
                disabled={notificationStatus === 'registering'}
                sx={{
                  ...buttonSx,
                  color:
                    notificationStatus === 'error'
                      ? c.danger
                      : notificationsRegistered
                        ? c.accent
                        : c.textSecondary,
                }}
                aria-label={
                  notificationsRegistered
                    ? 'disable payment notifications'
                    : 'enable payment notifications'
                }
              >
                {notificationStatus === 'registering' ? (
                  <CircularProgress size={18} color="inherit" />
                ) : notificationsRegistered ? (
                  <NotificationsActiveIcon fontSize="small" />
                ) : (
                  <NotificationsOffIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}

        <RatingControl qdnName={APP_QDN_NAME} identifier={APP_QDN_IDENTIFIER} />

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
      </Box>

      <Dialog
        open={notificationConsentOpen}
        onClose={() => setNotificationConsentOpen(false)}
        aria-labelledby="payment-notification-consent-title"
      >
        <DialogTitle id="payment-notification-consent-title">
          Enable payment notifications?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Wallet will ask Home for permission to notify you about incoming
            QORT and supported foreign-coin payments, including while Wallet is
            closed or unfocused.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Foreign-coin monitoring shares each wallet&apos;s watch-only
            extended public key with your configured Core node. This can reveal
            address history to that node, but it cannot be used to spend your
            funds.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationConsentOpen(false)}>
            Cancel
          </Button>
          <Button onClick={enablePaymentNotifications} variant="contained">
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notificationError !== null}
        autoHideDuration={8000}
        onClose={() => setNotificationError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setNotificationError(null)}
        >
          Payment notifications were not enabled. {notificationError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
