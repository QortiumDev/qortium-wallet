import { createTheme } from '@mui/material/styles';
import {
  getColorTokens,
  tokens,
  type AppThemeMode,
  type ColorTokens,
  type UiStyle,
} from '../../theme/tokens';

export function createAppTheme({
  mode,
  uiStyle,
  colors,
}: {
  mode: AppThemeMode;
  uiStyle: UiStyle;
  colors: ColorTokens;
}) {
  const isClassic = uiStyle === 'classic';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent,
        dark: colors.accentStrong,
        contrastText: colors.accentContrast,
      },
      error: { main: colors.error },
      success: { main: colors.success },
      background: { default: colors.pageBg, paper: colors.surface },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
      },
      divider: isClassic ? colors.border : colors.borderLight,
    },
    typography: {
      fontFamily: colors.fontFamily,
      h1: { fontSize: '2.5rem', fontWeight: tokens.typography.weightBlack },
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
      button: {
        textTransform: isClassic ? 'none' : 'uppercase',
        fontWeight: tokens.typography.weightBold,
        letterSpacing: isClassic ? 0 : '0.08em',
      },
    },
    spacing: 8,
    shape: { borderRadius: tokens.shape.radius },
    breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            backgroundColor: colors.pageBg,
            color: colors.text,
            fontFamily: colors.fontFamily,
          },
          body: {
            backgroundColor: colors.pageBg,
            color: colors.text,
            fontFamily: colors.fontFamily,
          },
          '#root': {
            minHeight: '100vh',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: isClassic ? colors.border : undefined,
            boxShadow: isClassic ? colors.shadowModal : undefined,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: colors.surface,
            color: colors.text,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: colors.surface,
            color: colors.text,
          },
        },
      },
      MuiTooltip: { defaultProps: { PopperProps: { disablePortal: true } } },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: isClassic ? 'none' : 'uppercase',
            letterSpacing: isClassic ? 0 : '0.08em',
            fontWeight: tokens.typography.weightBold,
            borderRadius: isClassic
              ? tokens.shape.radiusMd
              : tokens.shape.radius,
          },
        },
      },
    },
  });
}

export const lightTheme = createAppTheme({
  mode: 'light',
  uiStyle: 'modern',
  colors: getColorTokens('light', 'modern', 'green'),
});

export const darkTheme = createAppTheme({
  mode: 'dark',
  uiStyle: 'modern',
  colors: getColorTokens('dark', 'modern', 'green'),
});
