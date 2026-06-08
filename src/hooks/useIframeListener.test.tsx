import { describe, expect, it } from 'vitest';
import { applyTextSize, isSupportedTextSize } from './useIframeListener';

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
});
