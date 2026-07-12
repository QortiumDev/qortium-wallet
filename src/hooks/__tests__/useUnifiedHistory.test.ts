// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUnifiedHistory } from '../useUnifiedHistory';
import type { ChainConfig } from '../../config/chains';

declare const qdnRequest: ReturnType<typeof vi.fn>;

const QORT_CHAIN: ChainConfig = {
  key: 'QORT', name: 'Qortal', ticker: 'QORT', coinEnum: 'QORT' as any,
  route: 'qort', decimalPlaces: 8, isNative: true, defaultFee: 0.001,
  activeNetwork: 'MAIN', supportsHtlc: false, supportsLocalChainTrades: false,
};

const LTC_CHAIN: ChainConfig = {
  key: 'LTC', name: 'Litecoin', ticker: 'LTC', coinEnum: 'LTC' as any,
  route: 'ltc', decimalPlaces: 8, isNative: false, defaultFee: 0,
  activeNetwork: 'MAIN', supportsHtlc: true, supportsLocalChainTrades: true,
};

beforeEach(() => {
  (globalThis as any).qdnRequest = vi.fn();
});

describe('useUnifiedHistory', () => {
  it('returns empty rows and both chains loading initially', () => {
    (globalThis as any).qdnRequest.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useUnifiedHistory([QORT_CHAIN, LTC_CHAIN])
    );
    expect(result.current.rows).toEqual([]);
    expect(result.current.loadingChains).toContain('QORT');
    expect(result.current.loadingChains).toContain('LTC');
  });

  it('populates rows after both chains resolve and sorts by timestamp descending', async () => {
    (globalThis as any).qdnRequest.mockImplementation((opts: any) => {
      if (opts.action === 'GET_USER_WALLET') return Promise.resolve({ address: 'Qabc' });
      if (opts.action === 'FETCH_NODE_API')
        return Promise.resolve([
          { signature: 'sig1', amount: '1', fee: '0.001', timestamp: 2000, creatorAddress: 'Qsender', recipient: 'Qabc' },
        ]);
      if (opts.action === 'GET_USER_WALLET_TRANSACTIONS')
        return Promise.resolve([
          { txHash: 'hash2', totalAmount: 500000000, timestamp: 1000 },
        ]);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useUnifiedHistory([QORT_CHAIN, LTC_CHAIN])
    );

    await waitFor(() => expect(result.current.loadingChains).toHaveLength(0));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].timestamp).toBe(2000);
    expect(result.current.rows[1].timestamp).toBe(1000);
  });

  it('places errored chains in errorChains and removes from loadingChains', async () => {
    (globalThis as any).qdnRequest.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useUnifiedHistory([LTC_CHAIN]));
    await waitFor(() => expect(result.current.loadingChains).toHaveLength(0));
    expect(result.current.errorChains).toContain('LTC');
  });

  it('excludes ARRR from loadingChains', () => {
    (globalThis as any).qdnRequest.mockResolvedValue([]);
    const ARRR_CHAIN: ChainConfig = {
      key: 'ARRR', name: 'Pirate Chain', ticker: 'ARRR', coinEnum: 'ARRR' as any,
      route: 'arrr', decimalPlaces: 8, isNative: false, defaultFee: 0,
      activeNetwork: 'MAIN', supportsHtlc: false, supportsLocalChainTrades: false,
    };
    const { result } = renderHook(() =>
      useUnifiedHistory([QORT_CHAIN, ARRR_CHAIN])
    );
    expect(result.current.loadingChains).toContain('QORT');
    expect(result.current.loadingChains).not.toContain('ARRR');
  });
});
