import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export enum EnumTheme {
  LIGHT = 1,
  DARK = 2,
}

export type UiStyle = 'classic' | 'modern';

const UI_STYLES = new Set<UiStyle>(['classic', 'modern']);

export function parseUiStyle(value: string | null): UiStyle {
  return value && UI_STYLES.has(value as UiStyle)
    ? (value as UiStyle)
    : 'classic';
}

const _p = new URLSearchParams(window.location.search);
const _textSize = _p.get('textSize');
const _lang = _p.get('lang') ?? 'en';
const _accent = _p.get('accent') ?? 'green';
const _theme = _p.get('theme');
const _uiStyle = parseUiStyle(_p.get('uiStyle'));

if (_textSize) document.documentElement.dataset.textSize = _textSize;
document.documentElement.dataset.accent = _accent;
document.documentElement.dataset.ui = _uiStyle;
document.documentElement.lang = _lang;
document.documentElement.dir = _lang === 'ar' || _lang === 'he' ? 'rtl' : 'ltr';
document.documentElement.dataset.theme = _theme === 'light' ? 'light' : 'dark';
document.documentElement.style.colorScheme =
  _theme === 'light' ? 'light' : 'dark';

export const themeAtom = atom<EnumTheme>(
  _theme === 'light' ? EnumTheme.LIGHT : EnumTheme.DARK
);
export const accentAtom = atom<string>(_accent);
export const uiStyleAtom = atom<UiStyle>(_uiStyle);

export type SortMode =
  | 'custom'
  | 'name-asc'
  | 'name-desc'
  | 'balance-asc'
  | 'balance-desc';

export const sortModeAtom = atomWithStorage<SortMode>('qw-sort-mode', 'custom');
export const customOrderAtom = atomWithStorage<string[]>('qw-custom-order', []);

// 1 = biggest tiles, 9 = smallest tiles
export const tileSizeAtom = atomWithStorage<number>('qw-tile-zoom-v2', 3);

export const FIAT_CURRENCIES: { code: string; label: string }[] = [
  { code: 'usd', label: 'USD - US Dollar' },
  { code: 'eur', label: 'EUR - Euro' },
  { code: 'gbp', label: 'GBP - British Pound' },
  { code: 'jpy', label: 'JPY - Japanese Yen' },
  { code: 'aud', label: 'AUD - Australian Dollar' },
  { code: 'cad', label: 'CAD - Canadian Dollar' },
  { code: 'chf', label: 'CHF - Swiss Franc' },
  { code: 'cny', label: 'CNY - Chinese Yuan' },
  { code: 'inr', label: 'INR - Indian Rupee' },
  { code: 'krw', label: 'KRW - South Korean Won' },
  { code: 'brl', label: 'BRL - Brazilian Real' },
  { code: 'mxn', label: 'MXN - Mexican Peso' },
  { code: 'sgd', label: 'SGD - Singapore Dollar' },
  { code: 'hkd', label: 'HKD - Hong Kong Dollar' },
  { code: 'nok', label: 'NOK - Norwegian Krone' },
  { code: 'sek', label: 'SEK - Swedish Krona' },
];

export const currencyAtom = atomWithStorage<string>('qw-currency', 'usd');
export const hideZeroAtom = atomWithStorage<boolean>('qw-hide-zero', false);

// Total fiat value of all coin balances - written by CoinGrid, read by TopBar
export const portfolioFiatAtom = atom<number | null>(null);

// Per-coin fiat unit prices - written by the single app-wide poller (useMarketPricesPoller,
// mounted once in AppLayout), read by CoinGrid/CoinDetail/TopBar. Keeping one poller avoids
// each consumer opening its own GET_MARKET_PRICES interval and multiplying requests.
export const marketPricesAtom = atom<Record<string, number | undefined>>({});

// Set to true after the lock check + optional unlock prompt completes on mount
export const walletReadyAtom = atom<boolean>(false);

// Background payment notifications (own QORT address + foreign coin xpubs).
// notificationsSupportedAtom is set once after a SHOW_ACTIONS feature check;
// notificationsEnabledAtom is the user's local on/off preference, off by default.
export const notificationsSupportedAtom = atom<boolean>(false);
export const notificationsEnabledAtom = atomWithStorage<boolean>('qw-notifications-enabled', false);
