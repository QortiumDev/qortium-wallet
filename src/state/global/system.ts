import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export enum EnumTheme {
  LIGHT = 1,
  DARK = 2,
}

const _p = new URLSearchParams(window.location.search);
const _textSize = _p.get('textSize');
const _lang = _p.get('lang') ?? 'en';
const _accent = _p.get('accent') ?? 'green';
const _theme = _p.get('theme');

if (_textSize) document.documentElement.dataset.textSize = _textSize;
document.documentElement.lang = _lang;
document.documentElement.dir = _lang === 'ar' || _lang === 'he' ? 'rtl' : 'ltr';
document.documentElement.dataset.theme = _theme === 'light' ? 'light' : 'dark';
document.documentElement.style.colorScheme =
  _theme === 'light' ? 'light' : 'dark';

export const themeAtom = atom<EnumTheme>(
  _theme === 'light' ? EnumTheme.LIGHT : EnumTheme.DARK
);
export const accentAtom = atom<string>(_accent);

export type SortMode =
  | 'custom'
  | 'name-asc'
  | 'name-desc'
  | 'balance-asc'
  | 'balance-desc';

export const sortModeAtom = atomWithStorage<SortMode>('qw-sort-mode', 'custom');
export const customOrderAtom = atomWithStorage<string[]>('qw-custom-order', []);

// 1 = biggest tiles, 7 = smallest tiles
export const tileSizeAtom = atomWithStorage<number>('qw-tile-zoom', 1);
