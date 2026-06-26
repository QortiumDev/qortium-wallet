import { createContext, useContext } from 'react';
import { classicLightColors, type ColorTokens } from './tokens';

export const ColorTokensContext =
  createContext<ColorTokens>(classicLightColors);

export function useColors(): ColorTokens {
  return useContext(ColorTokensContext);
}
