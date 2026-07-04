import React, { FC, useMemo } from 'react';
import { ThemeProvider } from '@emotion/react';
import { createAppTheme } from './theme';
import { CssBaseline } from '@mui/material';
import {
  EnumTheme,
  themeAtom,
  accentAtom,
  uiStyleAtom,
} from '../../state/global/system';
import { useAtomValue } from 'jotai';
import { ColorTokensContext } from '../../theme/ColorTokensContext';
import { getColorTokens } from '../../theme/tokens';

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
}

const ThemeProviderWrapper: FC<ThemeProviderWrapperProps> = ({ children }) => {
  const theme = useAtomValue(themeAtom);
  const accent = useAtomValue(accentAtom);
  const uiStyle = useAtomValue(uiStyleAtom);
  const mode = theme === EnumTheme.DARK ? 'dark' : 'light';
  const colors = useMemo(
    () => getColorTokens(mode, uiStyle, accent),
    [accent, mode, uiStyle]
  );
  const muiTheme = useMemo(
    () => createAppTheme({ mode, uiStyle, colors }),
    [colors, mode, uiStyle]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <ColorTokensContext.Provider value={colors}>
        <CssBaseline />
        {children}
      </ColorTokensContext.Provider>
    </ThemeProvider>
  );
};

export default ThemeProviderWrapper;
