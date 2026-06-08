import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

type BridgeMessageData = {
  action?: unknown;
  language?: unknown;
  path?: unknown;
  textSize?: unknown;
  theme?: unknown;
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

function isBridgeMessageData(value: unknown): value is BridgeMessageData {
  return typeof value === 'object' && value !== null;
}

export function isTrustedBridgeMessage(event: MessageEvent<unknown>) {
  return event.source === window.parent || event.source === window;
}

export function isSafeNavigationPath(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const path = value.trim();
  if (!path) {
    return false;
  }

  return !/^[a-z][a-z0-9+.-]*:/i.test(path) && !path.startsWith('//');
}

export function getNavigationReplyTargetOrigin(event: MessageEvent<unknown>) {
  if (!event.origin || event.origin === 'null') {
    return null;
  }

  return event.origin;
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

    function handleNavigation(event: MessageEvent<unknown>) {
      if (!isTrustedBridgeMessage(event) || !isBridgeMessageData(event.data)) {
        return;
      }

      const data = event.data;

      if (
        data.action === 'NAVIGATE_TO_PATH' &&
        isSafeNavigationPath(data.path)
      ) {
        navigate(data.path); // Navigate directly to the specified path

        // Send a response back to the parent window after navigation is handled
        const replyTargetOrigin = getNavigationReplyTargetOrigin(event);
        if (replyTargetOrigin) {
          window.parent.postMessage(
            { action: 'NAVIGATION_SUCCESS', path: data.path },
            replyTargetOrigin
          );
        }
      } else if (data.action === 'THEME_CHANGED' && data.theme) {
        const themeColor = data.theme;
        if (themeColor === 'dark') {
          setTheme(EnumTheme.DARK);
        } else if (themeColor === 'light') {
          setTheme(EnumTheme.LIGHT);
        }
      } else if (data.action === 'LANGUAGE_CHANGED' && data.language) {
        if (!supportedLanguages?.includes(data.language as Language)) return;
        i18n.changeLanguage(data.language as Language);
      } else if (data.action === 'TEXT_SIZE_CHANGED' && data.textSize) {
        applyTextSize(data.textSize);
      }
    }

    window.addEventListener('message', handleNavigation);

    return () => {
      window.removeEventListener('message', handleNavigation);
    };
  }, [i18n, navigate, setTheme]);
  return { navigate };
};
