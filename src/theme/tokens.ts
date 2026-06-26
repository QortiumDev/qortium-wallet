export type AppThemeMode = 'light' | 'dark';
export type UiStyle = 'classic' | 'modern';
export type AccentName =
  | 'green'
  | 'blue'
  | 'orange'
  | 'purple'
  | 'red'
  | 'teal'
  | 'cyan'
  | 'pink'
  | 'yellow';

export interface ColorTokens {
  pageBg: string;
  frameBg: string;
  frameSurface: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  controlBg: string;
  controlHover: string;
  controlSelected: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textSubtle: string;
  textFaint: string;
  accent: string;
  accentStrong: string;
  accentContrast: string;
  accentRing: string;
  accentSoft: string;
  accentGlow: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  info: string;
  link: string;
  modalBackdrop: string;
  shadowColor: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  skeletonShimmer: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxBoolean: string;
  syntaxAttr: string;
  gradientPrimary: string;
  gradientPrimaryHover: string;
  gradientPrimaryActive: string;
  shadowPrimaryButton: string;
  shadowPrimaryButtonHover: string;
  shadowPrimaryButtonActive: string;
  shadowCard: string;
  shadowCardHover: string;
  shadowBar: string;
  shadowTabActive: string;
  shadowModal: string;
  shadowPop: string;
  easePop: string;
  transitionControl: string;
  fontFamily: string;
  monoFontFamily: string;
  layoutMaxWidth: string;
  layoutWideMaxWidth: string;
  dialogMaxWidth: string;
  topBarShadow: string;

  // Existing Wallet aliases.
  bg: string;
  borderLight: string;
  accentHover: string;
  accentText: string;
  textPrimary: string;
  success: string;
  error: string;
  overlay: string;
}

type TokenSeed = Omit<
  ColorTokens,
  | 'bg'
  | 'borderLight'
  | 'accentHover'
  | 'accentText'
  | 'textPrimary'
  | 'success'
  | 'error'
  | 'overlay'
> & {
  borderLight?: string;
  success?: string;
};

type AccentFamily = {
  accent: string;
  accentStrong: string;
  accentContrast: string;
};

const interFontFamily = 'Inter, sans-serif';
const lexendFontFamily =
  '"Lexend", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const monoFontFamily =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

function withAliases(seed: TokenSeed): ColorTokens {
  return {
    ...seed,
    bg: seed.pageBg,
    borderLight: seed.borderLight ?? seed.border,
    accentHover: seed.accentStrong,
    accentText: seed.accentContrast,
    textPrimary: seed.text,
    success: seed.success ?? seed.accent,
    error: seed.danger,
    overlay: seed.modalBackdrop,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((part) =>
      Math.round(Math.min(255, Math.max(0, part)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

function mix(hex: string, target: [number, number, number], amount: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex([
    rgb[0] + (target[0] - rgb[0]) * amount,
    rgb[1] + (target[1] - rgb[1]) * amount,
    rgb[2] + (target[2] - rgb[2]) * amount,
  ]);
}

function lighten(hex: string, amount: number) {
  return mix(hex, [255, 255, 255], amount);
}

function darken(hex: string, amount: number) {
  return mix(hex, [0, 0, 0], amount);
}

function alpha(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${amount})`;
}

function accentTokens(
  family: AccentFamily,
  mode: AppThemeMode,
  uiStyle: UiStyle
): Pick<
  ColorTokens,
  | 'accent'
  | 'accentStrong'
  | 'accentContrast'
  | 'accentRing'
  | 'accentSoft'
  | 'accentGlow'
  | 'gradientPrimary'
  | 'gradientPrimaryHover'
  | 'gradientPrimaryActive'
  | 'accentHover'
  | 'accentText'
> {
  return {
    accent: family.accent,
    accentStrong: family.accentStrong,
    accentContrast: family.accentContrast,
    accentRing: alpha(family.accent, uiStyle === 'classic' ? 0.2 : 0.18),
    accentSoft: alpha(family.accent, mode === 'dark' ? 0.12 : 0.1),
    accentGlow: alpha(family.accent, 0.22),
    gradientPrimary: `linear-gradient(180deg, ${lighten(
      family.accent,
      0.08
    )} 0%, ${family.accent} 55%, ${family.accentStrong} 100%)`,
    gradientPrimaryHover: `linear-gradient(180deg, ${lighten(
      family.accent,
      0.12
    )} 0%, ${lighten(family.accent, 0.06)} 55%, ${family.accent} 100%)`,
    gradientPrimaryActive: `linear-gradient(180deg, ${
      family.accentStrong
    } 0%, ${darken(family.accentStrong, 0.05)} 100%)`,
    accentHover: family.accentStrong,
    accentText: family.accentContrast,
  };
}

export const lightColors: ColorTokens = withAliases({
  pageBg: '#F2EFE6',
  frameBg: '#F2EFE6',
  frameSurface: '#F2EFE6',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F5EF',
  surfaceRaised: '#FFFFFF',
  controlBg: '#F7F5EF',
  controlHover: '#DDD9D0',
  controlSelected: '#EAF2ED',
  border: '#1C1C1C',
  borderStrong: '#1C1C1C',
  borderLight: '#DDD9D0',
  text: '#0D0D0D',
  textSecondary: '#6B6B6B',
  textSubtle: '#777777',
  textFaint: '#999999',
  accent: '#2D3A4A',
  accentStrong: '#1E2A36',
  accentContrast: '#FFFFFF',
  accentRing: 'rgba(45, 58, 74, 0.18)',
  accentSoft: 'rgba(45, 58, 74, 0.10)',
  accentGlow: 'rgba(45, 58, 74, 0.22)',
  danger: '#C0392B',
  dangerSoft: '#D85A52',
  warning: '#8F641B',
  info: '#2F6AA3',
  link: '#236FB8',
  modalBackdrop: 'rgba(13,13,13,0.55)',
  shadowColor: 'rgba(13,13,13,0.18)',
  scrollbarThumb: 'rgba(13,13,13,0.22)',
  scrollbarThumbHover: 'rgba(13,13,13,0.34)',
  skeletonShimmer: 'rgba(255,255,255,0.6)',
  syntaxString: '#1B6F3A',
  syntaxNumber: '#82540D',
  syntaxBoolean: '#6C43B8',
  syntaxAttr: '#A13E3B',
  gradientPrimary:
    'linear-gradient(180deg, #2D3A4A 0%, #2D3A4A 55%, #1E2A36 100%)',
  gradientPrimaryHover:
    'linear-gradient(180deg, #334257 0%, #2D3A4A 55%, #1E2A36 100%)',
  gradientPrimaryActive: 'linear-gradient(180deg, #1E2A36 0%, #19232D 100%)',
  shadowPrimaryButton: 'none',
  shadowPrimaryButtonHover: 'none',
  shadowPrimaryButtonActive: 'none',
  shadowCard: '0 1px 4px rgba(0,0,0,0.06)',
  shadowCardHover: '0 4px 16px rgba(45,58,74,0.22)',
  shadowBar: 'none',
  shadowTabActive: 'none',
  shadowModal: '0 24px 64px rgba(13,13,13,0.24)',
  shadowPop: '0 18px 48px rgba(13,13,13,0.18)',
  easePop: 'cubic-bezier(0.2, 0, 0, 1)',
  transitionControl:
    'background-color 170ms ease, border-color 170ms ease, color 170ms ease, box-shadow 170ms ease, transform 170ms ease',
  fontFamily: interFontFamily,
  monoFontFamily,
  layoutMaxWidth: '720px',
  layoutWideMaxWidth: '720px',
  dialogMaxWidth: '600px',
  topBarShadow: 'none',
  success: '#2D7A47',
});

export const darkColors: ColorTokens = withAliases({
  pageBg: '#111318',
  frameBg: '#111318',
  frameSurface: '#111318',
  surface: '#1C1F28',
  surfaceAlt: '#252A36',
  surfaceRaised: '#1C1F28',
  controlBg: '#252A36',
  controlHover: '#2E3340',
  controlSelected: '#263644',
  border: '#2E3340',
  borderStrong: '#2E3340',
  borderLight: '#252A36',
  text: '#E4E8F0',
  textSecondary: '#8892A4',
  textSubtle: '#7A8496',
  textFaint: '#657085',
  accent: '#4D6478',
  accentStrong: '#3D5164',
  accentContrast: '#FFFFFF',
  accentRing: 'rgba(77, 100, 120, 0.18)',
  accentSoft: 'rgba(77, 100, 120, 0.12)',
  accentGlow: 'rgba(77, 100, 120, 0.22)',
  danger: '#E05252',
  dangerSoft: '#EF8B84',
  warning: '#E4C06D',
  info: '#8BB8EF',
  link: '#7FB7FF',
  modalBackdrop: 'rgba(0,0,0,0.7)',
  shadowColor: 'rgba(0,0,0,0.35)',
  scrollbarThumb: 'rgba(255,255,255,0.14)',
  scrollbarThumbHover: 'rgba(255,255,255,0.24)',
  skeletonShimmer: 'rgba(255,255,255,0.07)',
  syntaxString: '#79D897',
  syntaxNumber: '#E0B060',
  syntaxBoolean: '#C7A2FF',
  syntaxAttr: '#FFAAA5',
  gradientPrimary:
    'linear-gradient(180deg, #4D6478 0%, #4D6478 55%, #3D5164 100%)',
  gradientPrimaryHover:
    'linear-gradient(180deg, #587186 0%, #4D6478 55%, #3D5164 100%)',
  gradientPrimaryActive: 'linear-gradient(180deg, #3D5164 0%, #334454 100%)',
  shadowPrimaryButton: 'none',
  shadowPrimaryButtonHover: 'none',
  shadowPrimaryButtonActive: 'none',
  shadowCard: '0 1px 4px rgba(0,0,0,0.06)',
  shadowCardHover: '0 4px 16px rgba(45,58,74,0.22)',
  shadowBar: 'none',
  shadowTabActive: 'none',
  shadowModal: '0 24px 64px rgba(0,0,0,0.55)',
  shadowPop: '0 18px 48px rgba(0,0,0,0.35)',
  easePop: 'cubic-bezier(0.2, 0, 0, 1)',
  transitionControl:
    'background-color 170ms ease, border-color 170ms ease, color 170ms ease, box-shadow 170ms ease, transform 170ms ease',
  fontFamily: interFontFamily,
  monoFontFamily,
  layoutMaxWidth: '720px',
  layoutWideMaxWidth: '720px',
  dialogMaxWidth: '600px',
  topBarShadow: 'none',
  success: '#4CAF7D',
});

export const classicLightColors: ColorTokens = withAliases({
  pageBg: '#f7f5ef',
  frameBg: '#ebe7de',
  frameSurface: '#f2efe7',
  surface: '#ffffff',
  surfaceAlt: '#f5f1e9',
  surfaceRaised: '#ffffff',
  controlBg: '#f0ece3',
  controlHover: '#e7e1d6',
  controlSelected: '#e9f3ec',
  border: '#d7d0c4',
  borderStrong: '#b8aea0',
  text: '#18201f',
  textSecondary: '#44504e',
  textSubtle: '#67716f',
  textFaint: '#89918e',
  accent: '#21824a',
  accentStrong: '#196a3a',
  accentContrast: '#ffffff',
  accentRing: 'rgb(33 130 74 / 18%)',
  accentSoft: 'rgb(33 130 74 / 10%)',
  accentGlow: 'rgb(33 130 74 / 22%)',
  danger: '#bd332e',
  dangerSoft: '#d85a52',
  warning: '#8f641b',
  info: '#2f6aa3',
  link: '#236fb8',
  modalBackdrop: 'rgb(24 27 27 / 38%)',
  shadowColor: 'rgb(35 31 24 / 18%)',
  scrollbarThumb: 'rgb(35 31 24 / 22%)',
  scrollbarThumbHover: 'rgb(35 31 24 / 34%)',
  skeletonShimmer: 'rgb(255 255 255 / 60%)',
  syntaxString: '#1b6f3a',
  syntaxNumber: '#82540d',
  syntaxBoolean: '#6c43b8',
  syntaxAttr: '#a13e3b',
  gradientPrimary:
    'linear-gradient(180deg, #21824a 0%, #21824a 55%, #1d7341 100%)',
  gradientPrimaryHover:
    'linear-gradient(180deg, #23854e 0%, #22834c 55%, #1f7845 100%)',
  gradientPrimaryActive: 'linear-gradient(180deg, #1d7341 0%, #196a3a 100%)',
  shadowPrimaryButton:
    'inset 0 1px 0 rgb(255 255 255 / 18%), 0 2px 8px rgb(33 130 74 / 25%), 0 0 16px var(--color-accent-glow)',
  shadowPrimaryButtonHover:
    'inset 0 1px 0 rgb(255 255 255 / 22%), 0 4px 12px rgb(33 130 74 / 30%), 0 0 20px var(--color-accent-glow)',
  shadowPrimaryButtonActive:
    'inset 0 1px 0 rgb(255 255 255 / 10%), 0 1px 4px rgb(33 130 74 / 22%)',
  shadowCard: '0 1px 2px rgb(35 31 24 / 4%), 0 8px 24px rgb(35 31 24 / 6%)',
  shadowCardHover:
    '0 2px 4px rgb(35 31 24 / 5%), 0 12px 28px rgb(35 31 24 / 9%)',
  shadowBar: '0 1px 2px rgb(35 31 24 / 4%), 0 4px 16px rgb(35 31 24 / 3%)',
  shadowTabActive:
    'inset 0 1px 0 rgb(255 255 255 / 55%), 0 1px 2px rgb(35 31 24 / 6%)',
  shadowModal: '0 24px 64px rgb(35 31 24 / 26%)',
  shadowPop: '0 18px 48px var(--color-shadow)',
  easePop: 'cubic-bezier(0.2, 0, 0, 1)',
  transitionControl:
    'background-color 170ms ease, border-color 170ms ease, color 170ms ease, box-shadow 170ms ease, transform 170ms ease',
  fontFamily: lexendFontFamily,
  monoFontFamily,
  layoutMaxWidth: '61em',
  layoutWideMaxWidth: '70em',
  dialogMaxWidth: '70em',
  topBarShadow: '0 1px 2px rgb(35 31 24 / 4%), 0 4px 16px rgb(35 31 24 / 3%)',
  success: '#2d7a47',
});

export const classicDarkColors: ColorTokens = withAliases({
  pageBg: '#0e1111',
  frameBg: '#0b0e0e',
  frameSurface: '#101414',
  surface: '#161d1d',
  surfaceAlt: '#1b2424',
  surfaceRaised: '#1f2929',
  controlBg: '#243030',
  controlHover: '#2c3939',
  controlSelected: '#213831',
  border: '#364444',
  borderStrong: '#5a6b6b',
  text: '#f4f0e8',
  textSecondary: '#cbd5d5',
  textSubtle: '#a9b6b6',
  textFaint: '#7f8d8d',
  accent: '#87d99b',
  accentStrong: '#6fcd87',
  accentContrast: '#0e1411',
  accentRing: 'rgb(135 217 155 / 20%)',
  accentSoft: 'rgb(135 217 155 / 12%)',
  accentGlow: 'rgb(135 217 155 / 22%)',
  danger: '#ef8b84',
  dangerSoft: '#ffb5ae',
  warning: '#e4c06d',
  info: '#8bb8ef',
  link: '#7fb7ff',
  modalBackdrop: 'rgb(0 0 0 / 45%)',
  shadowColor: 'rgb(0 0 0 / 35%)',
  scrollbarThumb: 'rgb(255 255 255 / 14%)',
  scrollbarThumbHover: 'rgb(255 255 255 / 24%)',
  skeletonShimmer: 'rgb(255 255 255 / 7%)',
  syntaxString: '#79d897',
  syntaxNumber: '#e0b060',
  syntaxBoolean: '#c7a2ff',
  syntaxAttr: '#ffaaa5',
  gradientPrimary:
    'linear-gradient(180deg, #95e0a7 0%, #87d99b 55%, #79cf8e 100%)',
  gradientPrimaryHover:
    'linear-gradient(180deg, #a2e6b2 0%, #93e0a5 55%, #84d698 100%)',
  gradientPrimaryActive: 'linear-gradient(180deg, #79cf8e 0%, #6fc683 100%)',
  shadowPrimaryButton:
    'inset 0 1px 0 rgb(255 255 255 / 12%), 0 2px 8px rgb(0 0 0 / 30%), 0 0 16px var(--color-accent-glow)',
  shadowPrimaryButtonHover:
    'inset 0 1px 0 rgb(255 255 255 / 16%), 0 4px 12px rgb(0 0 0 / 35%), 0 0 20px var(--color-accent-glow)',
  shadowPrimaryButtonActive:
    'inset 0 1px 0 rgb(255 255 255 / 8%), 0 1px 4px rgb(0 0 0 / 30%)',
  shadowCard: '0 1px 2px rgb(0 0 0 / 20%), 0 8px 20px rgb(0 0 0 / 25%)',
  shadowCardHover: '0 2px 4px rgb(0 0 0 / 24%), 0 12px 26px rgb(0 0 0 / 32%)',
  shadowBar: '0 1px 2px rgb(0 0 0 / 25%), 0 4px 16px rgb(0 0 0 / 18%)',
  shadowTabActive:
    'inset 0 1px 0 rgb(255 255 255 / 10%), 0 1px 2px rgb(0 0 0 / 25%)',
  shadowModal: '0 24px 64px rgb(0 0 0 / 55%)',
  shadowPop: '0 18px 48px var(--color-shadow)',
  easePop: 'cubic-bezier(0.2, 0, 0, 1)',
  transitionControl:
    'background-color 170ms ease, border-color 170ms ease, color 170ms ease, box-shadow 170ms ease, transform 170ms ease',
  fontFamily: lexendFontFamily,
  monoFontFamily,
  layoutMaxWidth: '61em',
  layoutWideMaxWidth: '70em',
  dialogMaxWidth: '70em',
  topBarShadow: '0 1px 2px rgb(0 0 0 / 25%), 0 4px 16px rgb(0 0 0 / 18%)',
  success: '#79d897',
});

export const ACCENT_MAP: Record<
  UiStyle,
  Record<AppThemeMode, Record<AccentName, AccentFamily>>
> = {
  modern: {
    light: {
      green: {
        accent: '#21824a',
        accentStrong: '#1a6638',
        accentContrast: '#FFFFFF',
      },
      blue: {
        accent: '#2a79f3',
        accentStrong: '#1a64d0',
        accentContrast: '#FFFFFF',
      },
      orange: {
        accent: '#de8b23',
        accentStrong: '#b8721c',
        accentContrast: '#FFFFFF',
      },
      purple: {
        accent: '#7b44da',
        accentStrong: '#6433b5',
        accentContrast: '#FFFFFF',
      },
      red: {
        accent: '#d53e3e',
        accentStrong: '#b32e2e',
        accentContrast: '#FFFFFF',
      },
      teal: {
        accent: '#17a398',
        accentStrong: '#128078',
        accentContrast: '#FFFFFF',
      },
      cyan: {
        accent: '#1298d8',
        accentStrong: '#0d7ab0',
        accentContrast: '#FFFFFF',
      },
      pink: {
        accent: '#d43f86',
        accentStrong: '#b0326e',
        accentContrast: '#FFFFFF',
      },
      yellow: {
        accent: '#d6a828',
        accentStrong: '#b08a20',
        accentContrast: '#1e1400',
      },
    },
    dark: {
      green: {
        accent: '#21824a',
        accentStrong: '#1a6638',
        accentContrast: '#FFFFFF',
      },
      blue: {
        accent: '#2a79f3',
        accentStrong: '#1a64d0',
        accentContrast: '#FFFFFF',
      },
      orange: {
        accent: '#de8b23',
        accentStrong: '#b8721c',
        accentContrast: '#FFFFFF',
      },
      purple: {
        accent: '#7b44da',
        accentStrong: '#6433b5',
        accentContrast: '#FFFFFF',
      },
      red: {
        accent: '#d53e3e',
        accentStrong: '#b32e2e',
        accentContrast: '#FFFFFF',
      },
      teal: {
        accent: '#17a398',
        accentStrong: '#128078',
        accentContrast: '#FFFFFF',
      },
      cyan: {
        accent: '#1298d8',
        accentStrong: '#0d7ab0',
        accentContrast: '#FFFFFF',
      },
      pink: {
        accent: '#d43f86',
        accentStrong: '#b0326e',
        accentContrast: '#FFFFFF',
      },
      yellow: {
        accent: '#d6a828',
        accentStrong: '#b08a20',
        accentContrast: '#1e1400',
      },
    },
  },
  classic: {
    light: {
      green: {
        accent: '#21824a',
        accentStrong: '#196a3a',
        accentContrast: '#ffffff',
      },
      blue: {
        accent: '#2368cf',
        accentStrong: '#1e5ec3',
        accentContrast: '#ffffff',
      },
      orange: {
        accent: '#de8b23',
        accentStrong: '#bf6e0f',
        accentContrast: '#2a1c00',
      },
      purple: {
        accent: '#7b44da',
        accentStrong: '#622fbd',
        accentContrast: '#ffffff',
      },
      red: {
        accent: '#c63838',
        accentStrong: '#b63232',
        accentContrast: '#ffffff',
      },
      teal: {
        accent: '#17a398',
        accentStrong: '#12857a',
        accentContrast: '#031817',
      },
      cyan: {
        accent: '#1298d8',
        accentStrong: '#0f79aa',
        accentContrast: '#000a12',
      },
      pink: {
        accent: '#bd3673',
        accentStrong: '#bd3673',
        accentContrast: '#ffffff',
      },
      yellow: {
        accent: '#d6a828',
        accentStrong: '#bd8f20',
        accentContrast: '#1e1400',
      },
    },
    dark: {
      green: {
        accent: '#87d99b',
        accentStrong: '#6fcd87',
        accentContrast: '#0e1411',
      },
      blue: {
        accent: '#8abefe',
        accentStrong: '#7aaef7',
        accentContrast: '#061733',
      },
      orange: {
        accent: '#f1b16d',
        accentStrong: '#eaa257',
        accentContrast: '#2a1c00',
      },
      purple: {
        accent: '#caa2ff',
        accentStrong: '#b58dff',
        accentContrast: '#1c0c3d',
      },
      red: {
        accent: '#f19a9a',
        accentStrong: '#dd7a7a',
        accentContrast: '#301111',
      },
      teal: {
        accent: '#6ed9d1',
        accentStrong: '#5fc3bc',
        accentContrast: '#072523',
      },
      cyan: {
        accent: '#88d2ff',
        accentStrong: '#79c5f5',
        accentContrast: '#03243d',
      },
      pink: {
        accent: '#f8a7cf',
        accentStrong: '#f58cbf',
        accentContrast: '#2a0d23',
      },
      yellow: {
        accent: '#f4cb67',
        accentStrong: '#edbf53',
        accentContrast: '#2f2100',
      },
    },
  },
};

function isAccentName(value: string): value is AccentName {
  return Object.prototype.hasOwnProperty.call(ACCENT_MAP.classic.light, value);
}

export function getBaseTokens(
  mode: AppThemeMode,
  uiStyle: UiStyle
): ColorTokens {
  if (uiStyle === 'classic') {
    return mode === 'dark' ? classicDarkColors : classicLightColors;
  }
  return mode === 'dark' ? darkColors : lightColors;
}

export function applyAccent(
  colors: ColorTokens,
  accent: string,
  mode: AppThemeMode = colors === darkColors || colors === classicDarkColors
    ? 'dark'
    : 'light',
  uiStyle: UiStyle = colors === classicLightColors ||
  colors === classicDarkColors
    ? 'classic'
    : 'modern'
): ColorTokens {
  if (!isAccentName(accent)) return colors;
  if (uiStyle === 'classic' && accent === 'green') return colors;

  return {
    ...colors,
    ...accentTokens(ACCENT_MAP[uiStyle][mode][accent], mode, uiStyle),
  };
}

export function getColorTokens(
  mode: AppThemeMode,
  uiStyle: UiStyle,
  accent: string
): ColorTokens {
  return applyAccent(getBaseTokens(mode, uiStyle), accent, mode, uiStyle);
}

export const tokens = {
  typography: {
    fontFamily: interFontFamily,
    classicFontFamily: lexendFontFamily,
    monoFontFamily,
    weightRegular: 400,
    weightMedium: 500,
    weightBold: 700,
    weightBlack: 900,
  },
  shape: {
    radius: 8,
    radiusSm: 6,
    radiusMd: 8,
    radiusPill: 999,
    borderWidth: '1.5px',
    classicBorderWidth: '1px',
  },
  spacing: {
    topBarHeight: 52,
    classicTopBarOffset: 60,
    space1: 4,
    space2: 8,
    space3: 12,
    space4: 16,
    space5: 20,
    space6: 24,
  },
} as const;
