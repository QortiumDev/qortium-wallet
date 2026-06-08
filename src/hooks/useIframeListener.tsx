import { useEffect } from 'react';
import { To, useNavigate } from 'react-router-dom';
import { EnumTheme, themeAtom } from '../state/global/system';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n/i18n';

type Language =
  | 'ar'
  | 'de'
  | 'en'
  | 'es'
  | 'et'
  | 'fr'
  | 'it'
  | 'pt'
  | 'ru'
  | 'ja'
  | 'zh';
type Theme = 'dark' | 'light';
export type TextSize =
  | 'extra-large'
  | 'extra-small'
  | 'large'
  | 'medium'
  | 'small';

const SUPPORTED_TEXT_SIZES: readonly TextSize[] = [
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
];

type CustomWindow = {
  _qdnTheme?: Theme;
  _qdnLang?: Language;
  _qdnTextSize?: TextSize;
};

const customWindow = window as unknown as CustomWindow;

export function isSupportedTextSize(value: unknown): value is TextSize {
  return (
    typeof value === 'string' &&
    SUPPORTED_TEXT_SIZES.includes(value as TextSize)
  );
}

export function applyTextSize(
  value: unknown,
  root: HTMLElement = document.documentElement
) {
  if (!isSupportedTextSize(value)) {
    return;
  }

  root.dataset.textSize = value;
}

export const useIframe = () => {
  const setTheme = useSetAtom(themeAtom);
  const { i18n } = useTranslation();

  const navigate = useNavigate();
  useEffect(() => {
    const themeColorDefault = customWindow?._qdnTheme;
    if (themeColorDefault === 'dark') {
      setTheme(EnumTheme.DARK);
    } else if (themeColorDefault === 'light') {
      setTheme(EnumTheme.LIGHT);
    }

    const languageDefault = customWindow?._qdnLang;

    if (languageDefault && supportedLanguages?.includes(languageDefault)) {
      i18n.changeLanguage(languageDefault);
    }

    applyTextSize(customWindow?._qdnTextSize);

    function handleNavigation(event: {
      data: {
        action: string;
        path: To;
        theme: Theme;
        language: Language;
        textSize: TextSize;
      };
    }) {
      if (event.data?.action === 'NAVIGATE_TO_PATH' && event.data.path) {
        navigate(event.data.path); // Navigate directly to the specified path

        // Send a response back to the parent window after navigation is handled
        window.parent.postMessage(
          { action: 'NAVIGATION_SUCCESS', path: event.data.path },
          '*'
        );
      } else if (event.data?.action === 'THEME_CHANGED' && event.data.theme) {
        const themeColor = event.data.theme;
        if (themeColor === 'dark') {
          setTheme(EnumTheme.DARK);
        } else if (themeColor === 'light') {
          setTheme(EnumTheme.LIGHT);
        }
      } else if (
        event.data?.action === 'LANGUAGE_CHANGED' &&
        event.data.language
      ) {
        if (!supportedLanguages?.includes(event.data.language)) return;
        i18n.changeLanguage(event.data.language);
      } else if (
        event.data?.action === 'TEXT_SIZE_CHANGED' &&
        event.data.textSize
      ) {
        applyTextSize(event.data.textSize);
      }
    }

    window.addEventListener('message', handleNavigation);

    return () => {
      window.removeEventListener('message', handleNavigation);
    };
  }, [i18n, navigate, setTheme]);
  return { navigate };
};
