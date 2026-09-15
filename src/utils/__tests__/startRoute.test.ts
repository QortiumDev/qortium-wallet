import { describe, expect, it } from 'vitest';
import { resolveStartRoute } from '../startRoute';

describe('resolveStartRoute', () => {
  it('starts on the coin grid with no query', () => {
    expect(resolveStartRoute('')).toBeNull();
    expect(resolveStartRoute('?theme=dark')).toBeNull();
  });

  it('keeps the _route hand-off and lets it win over to=', () => {
    expect(resolveStartRoute('?_route=/history')).toBe('/history');
    expect(resolveStartRoute('?_route=/history&to=QabcDEF')).toBe('/history');
  });

  it('opens the native send form with the recipient from to=', () => {
    expect(resolveStartRoute('?to=QPqXmv1TrDerSSpTrFvNVzqK4m4ktNM86b')).toBe(
      '/qortal?send=true&to=QPqXmv1TrDerSSpTrFvNVzqK4m4ktNM86b'
    );
  });

  it('accepts a registered name and trims whitespace', () => {
    expect(resolveStartRoute('?to=%20Alice%20')).toBe(
      '/qortal?send=true&to=Alice'
    );
  });

  it('opens the send form without a recipient for send=true alone', () => {
    expect(resolveStartRoute('?send=true')).toBe('/qortal?send=true');
    expect(resolveStartRoute('?send=false')).toBeNull();
  });

  it('ignores an implausible recipient', () => {
    expect(resolveStartRoute(`?to=${'Q'.repeat(65)}`)).toBeNull();
    expect(resolveStartRoute('?to=Qabc%0Adef')).toBeNull();
  });

  it('re-encodes the recipient into the hash query', () => {
    expect(resolveStartRoute('?to=a%26b')).toBe('/qortal?send=true&to=a%26b');
  });
});
