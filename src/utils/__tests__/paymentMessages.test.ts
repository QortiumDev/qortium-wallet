import { describe, expect, it, beforeEach } from 'vitest';
import {
  getMessageQdnIdentifier,
  cacheMessage,
  getCachedMessage,
  buildMessagePayload,
} from '../paymentMessages';

describe('paymentMessages', () => {
  beforeEach(() => localStorage.clear());

  it('builds a deterministic QDN identifier from a tx hash', () => {
    expect(getMessageQdnIdentifier('abc123')).toBe('wallet-payment-msg-abc123');
  });

  it('caches and retrieves a message by tx hash', () => {
    cacheMessage('abc123', 'thanks for lunch');
    expect(getCachedMessage('abc123')).toBe('thanks for lunch');
  });

  it('returns null for an uncached tx hash', () => {
    expect(getCachedMessage('missing')).toBeNull();
  });

  it('buildMessagePayload includes all required fields with a numeric timestamp', () => {
    const p = buildMessagePayload('thanks', 'sig123', 'LTC', '0.5');
    expect(p).toMatchObject({ message: 'thanks', txHash: 'sig123', coin: 'LTC', amount: '0.5' });
    expect(typeof p.timestamp).toBe('number');
  });
});
