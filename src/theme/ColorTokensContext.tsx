import { createContext, useContext } from 'react';
import { lightColors, type ColorTokens } from './tokens';

export const ColorTokensContext = createContext<ColorTokens>(lightColors);

export function useColors(): ColorTokens {
  return useContext(ColorTokensContext);
}
