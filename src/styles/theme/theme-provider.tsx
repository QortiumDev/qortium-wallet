import React, { FC } from 'react';
import { ThemeProvider } from '@emotion/react';
import { lightTheme, darkTheme } from './theme';
import { CssBaseline } from '@mui/material';
import { EnumTheme, themeAtom, accentAtom } from '../../state/global/system';
import { useAtom } from 'jotai';
import { ColorTokensContext } from '../../theme/ColorTokensContext';
import { lightColors, darkColors, applyAccent } from '../../theme/tokens';

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
}

const ThemeProviderWrapper: FC<ThemeProviderWrapperProps> = ({ children }) => {
  const [theme] = useAtom(themeAtom);
  const [accent] = useAtom(accentAtom);
  const isDark = theme === EnumTheme.DARK;
  const colors = applyAccent(isDark ? darkColors : lightColors, accent);

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <ColorTokensContext.Provider value={colors}>
        <CssBaseline />
        {children}
      </ColorTokensContext.Provider>
    </ThemeProvider>
  );
};

export default ThemeProviderWrapper;
