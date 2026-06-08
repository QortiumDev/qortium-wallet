import { describe, expect, it } from 'vitest';
import {
  applyTextSize,
  getNavigationReplyTargetOrigin,
  isSafeNavigationPath,
  isSupportedTextSize,
  isTrustedBridgeMessage,
} from './useIframeListener';

describe('Home display settings bridge', () => {
  it('recognizes Home text-size values', () => {
    expect(isSupportedTextSize('extra-small')).toBe(true);
    expect(isSupportedTextSize('small')).toBe(true);
    expect(isSupportedTextSize('medium')).toBe(true);
    expect(isSupportedTextSize('large')).toBe(true);
    expect(isSupportedTextSize('extra-large')).toBe(true);
    expect(isSupportedTextSize('extraLarge')).toBe(false);
    expect(isSupportedTextSize('')).toBe(false);
  });

  it('applies valid text-size values to the document root', () => {
    const root = document.createElement('html');

    applyTextSize('large', root);
    expect(root.dataset.textSize).toBe('large');

    applyTextSize('extraLarge', root);
    expect(root.dataset.textSize).toBe('large');
  });

  it('trusts parent and native injected bridge messages only', () => {
    expect(
      isTrustedBridgeMessage(new MessageEvent('message', { source: window }))
    ).toBe(true);
    expect(isTrustedBridgeMessage(new MessageEvent('message'))).toBe(false);
  });

  it('rejects unsafe navigation paths from bridge messages', () => {
    expect(isSafeNavigationPath('/wallets')).toBe(true);
    expect(isSafeNavigationPath('wallets')).toBe(true);
    expect(isSafeNavigationPath('')).toBe(false);
    expect(isSafeNavigationPath('https://example.com')).toBe(false);
    expect(isSafeNavigationPath('javascript:alert(1)')).toBe(false);
    expect(isSafeNavigationPath('//example.com/path')).toBe(false);
  });

  it('uses the sender origin for navigation replies', () => {
    expect(
      getNavigationReplyTargetOrigin(
        new MessageEvent('message', { origin: 'https://home.example' })
      )
    ).toBe('https://home.example');
    expect(
      getNavigationReplyTargetOrigin(
        new MessageEvent('message', { origin: 'null' })
      )
    ).toBeNull();
  });
});
