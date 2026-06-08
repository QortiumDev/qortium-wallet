import { atomWithStorage } from 'jotai/utils';

export enum EnumTheme {
  LIGHT = 1,
  DARK = 2,
}

export const themeAtom = atomWithStorage<EnumTheme>('qw-theme', EnumTheme.DARK);

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
