export interface ColorTokens {
  bg: string;
  surface: string;
  border: string;
  borderLight: string;
  accent: string;
  accentHover: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  error: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  bg: '#F2EFE6',
  surface: '#FFFFFF',
  border: '#1C1C1C',
  borderLight: '#DDD9D0',
  accent: '#2D3A4A',
  accentHover: '#1E2A36',
  accentText: '#FFFFFF',
  textPrimary: '#0D0D0D',
  textSecondary: '#6B6B6B',
  success: '#2D7A47',
  error: '#C0392B',
  overlay: 'rgba(13,13,13,0.55)',
};

export const darkColors: ColorTokens = {
  bg: '#111318',
  surface: '#1C1F28',
  border: '#2E3340',
  borderLight: '#252A36',
  accent: '#4D6478',
  accentHover: '#3D5164',
  accentText: '#FFFFFF',
  textPrimary: '#E4E8F0',
  textSecondary: '#8892A4',
  success: '#4CAF7D',
  error: '#E05252',
  overlay: 'rgba(0,0,0,0.7)',
};

export const ACCENT_MAP: Record<
  string,
  { accent: string; accentHover: string }
> = {
  green: { accent: '#21824a', accentHover: '#1a6638' },
  blue: { accent: '#2a79f3', accentHover: '#1a64d0' },
  orange: { accent: '#de8b23', accentHover: '#b8721c' },
  purple: { accent: '#7b44da', accentHover: '#6433b5' },
  red: { accent: '#d53e3e', accentHover: '#b32e2e' },
  teal: { accent: '#17a398', accentHover: '#128078' },
  cyan: { accent: '#1298d8', accentHover: '#0d7ab0' },
  pink: { accent: '#d43f86', accentHover: '#b0326e' },
  yellow: { accent: '#d6a828', accentHover: '#b08a20' },
};

export function applyAccent(colors: ColorTokens, accent: string): ColorTokens {
  const a = ACCENT_MAP[accent];
  if (!a) return colors;
  return { ...colors, accent: a.accent, accentHover: a.accentHover };
}

export const tokens = {
  typography: {
    fontFamily: 'Inter, sans-serif',
    weightRegular: 400,
    weightMedium: 500,
    weightBold: 700,
    weightBlack: 900,
  },
  shape: {
    radius: 8,
    borderWidth: '1.5px',
  },
  spacing: {
    topBarHeight: 52,
  },
} as const;
