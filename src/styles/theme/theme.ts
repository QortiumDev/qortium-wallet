import { createTheme } from '@mui/material/styles';
import { tokens, lightColors, darkColors } from '../../theme/tokens';

const baseTheme = createTheme({
  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: {
      fontSize: '2.5rem',
      fontWeight: tokens.typography.weightBlack,
      letterSpacing: '-0.02em',
    },
    h2: { fontSize: '2rem', fontWeight: tokens.typography.weightBold },
    h3: { fontSize: '1.5rem', fontWeight: tokens.typography.weightBold },
    h4: { fontSize: '1.25rem', fontWeight: tokens.typography.weightBold },
    h5: { fontSize: '1rem', fontWeight: tokens.typography.weightMedium },
    h6: { fontSize: '0.875rem', fontWeight: tokens.typography.weightMedium },
    body1: {
      fontSize: '1rem',
      fontWeight: tokens.typography.weightRegular,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: tokens.typography.weightRegular,
      lineHeight: 1.4,
    },
    caption: {
      fontSize: '0.75rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    },
  },
  spacing: 8,
  shape: { borderRadius: tokens.shape.radius },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  components: {
    MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } },
    MuiPopover: { styleOverrides: { paper: { backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: tokens.typography.weightBold,
        },
      },
    },
  },
});

export const lightTheme = createTheme(baseTheme, {
  palette: {
    mode: 'light',
    primary: { main: lightColors.accent, contrastText: lightColors.accentText },
    error: { main: lightColors.error },
    success: { main: lightColors.success },
    background: { default: lightColors.bg, paper: lightColors.surface },
    text: {
      primary: lightColors.textPrimary,
      secondary: lightColors.textSecondary,
    },
    divider: lightColors.borderLight,
  },
});

export const darkTheme = createTheme(baseTheme, {
  palette: {
    mode: 'dark',
    primary: { main: darkColors.accent, contrastText: darkColors.accentText },
    error: { main: darkColors.error },
    success: { main: darkColors.success },
    background: { default: darkColors.bg, paper: darkColors.surface },
    text: {
      primary: darkColors.textPrimary,
      secondary: darkColors.textSecondary,
    },
    divider: darkColors.borderLight,
  },
});
