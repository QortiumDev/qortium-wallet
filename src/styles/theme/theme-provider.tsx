import React, { FC } from 'react';
import { ThemeProvider } from '@emotion/react';
import { lightTheme, darkTheme } from './theme';
import { CssBaseline } from '@mui/material';
import { EnumTheme, themeAtom } from '../../state/global/system';
import { useAtom } from 'jotai';
import { ColorTokensContext } from '../../theme/ColorTokensContext';
import { lightColors, darkColors } from '../../theme/tokens';

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
}

const ThemeProviderWrapper: FC<ThemeProviderWrapperProps> = ({ children }) => {
  const [theme] = useAtom(themeAtom);
  const isDark = theme === EnumTheme.DARK;

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <ColorTokensContext.Provider value={isDark ? darkColors : lightColors}>
        <CssBaseline />
        {children}
      </ColorTokensContext.Provider>
    </ThemeProvider>
  );
};

export default ThemeProviderWrapper;
