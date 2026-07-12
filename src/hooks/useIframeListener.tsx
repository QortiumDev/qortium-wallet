import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EnumTheme,
  themeAtom,
  accentAtom,
  uiStyleAtom,
  parseUiStyle,
} from '../state/global/system';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n/i18n';

type Theme = 'dark' | 'light';

export type TextSize =
  | 'extra-large'
  | 'extra-small'
  | 'huge'
  | 'large'
  | 'medium'
  | 'small';

const SUPPORTED_TEXT_SIZES: readonly TextSize[] = [
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
  'huge',
];

type BridgeMessageData = {
  action?: unknown;
  accent?: unknown;
  language?: unknown;
  path?: unknown;
  textSize?: unknown;
  theme?: unknown;
  uiStyle?: unknown;
};

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
  const setAccent = useSetAtom(accentAtom);
  const setUiStyle = useSetAtom(uiStyleAtom);
  const { i18n } = useTranslation();

  const navigate = useNavigate();
  useEffect(() => {
    function handleNavigation(event: MessageEvent<unknown>) {
      if (!isTrustedBridgeMessage(event) || !isBridgeMessageData(event.data)) {
        return;
      }

      const data = event.data;

      if (
        data.action === 'NAVIGATE_TO_PATH' &&
        isSafeNavigationPath(data.path)
      ) {
        navigate(data.path);

        const replyTargetOrigin = getNavigationReplyTargetOrigin(event);
        if (replyTargetOrigin) {
          window.parent.postMessage(
            { action: 'NAVIGATION_SUCCESS', path: data.path },
            replyTargetOrigin
          );
        }
      } else if (data.action === 'THEME_CHANGED' && data.theme) {
        const themeColor = data.theme as Theme;
        if (themeColor === 'dark') {
          setTheme(EnumTheme.DARK);
          document.documentElement.dataset.theme = 'dark';
          document.documentElement.style.colorScheme = 'dark';
        } else if (themeColor === 'light') {
          setTheme(EnumTheme.LIGHT);
          document.documentElement.dataset.theme = 'light';
          document.documentElement.style.colorScheme = 'light';
        }
      } else if (
        data.action === 'ACCENT_CHANGED' &&
        typeof data.accent === 'string'
      ) {
        setAccent(data.accent);
        document.documentElement.dataset.accent = data.accent;
      } else if (
        data.action === 'LANGUAGE_CHANGED' &&
        typeof data.language === 'string'
      ) {
        if (supportedLanguages?.includes(data.language)) {
          i18n.changeLanguage(data.language);
        }
        document.documentElement.lang = data.language;
        document.documentElement.dir =
          data.language === 'ar' || data.language === 'he' ? 'rtl' : 'ltr';
      } else if (data.action === 'TEXT_SIZE_CHANGED' && data.textSize) {
        applyTextSize(data.textSize);
      } else if (
        data.action === 'UI_STYLE_CHANGED' &&
        typeof data.uiStyle === 'string'
      ) {
        const uiStyle = parseUiStyle(data.uiStyle);
        setUiStyle(uiStyle);
        document.documentElement.dataset.ui = uiStyle;
      }
    }

    window.addEventListener('message', handleNavigation);

    return () => {
      window.removeEventListener('message', handleNavigation);
    };
  }, [i18n, navigate, setTheme, setAccent, setUiStyle]);
  return { navigate };
};
