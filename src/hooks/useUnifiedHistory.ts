import { useState, useEffect, useCallback } from 'react';
import type { ChainConfig } from '../config/chains';
import type { TxRow } from '../components/wallet/TransactionRow';
import { requestWithTimeout } from '../common/functions';
import { TIME_MINUTES_5 } from '../common/constants';

export interface UnifiedTxRow extends TxRow {
  chain: ChainConfig;
}

export interface UseUnifiedHistoryResult {
  rows: UnifiedTxRow[];
  loadingChains: string[];
  errorChains: string[];
}

async function fetchChainTxs(chain: ChainConfig): Promise<TxRow[]> {
  if (chain.isNative) {
    const wallet = await qdnRequest({
      action: 'GET_USER_WALLET',
      assetId: 0,
    } as any);
    const addr = wallet?.address;
    if (!addr) return [];

    const data: any[] = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/transactions/search?txType=PAYMENT&address=${encodeURIComponent(addr)}&confirmationStatus=CONFIRMED&limit=20&reverse=true`,
    } as any).then((r: any) => (Array.isArray(r) ? r : []));

    return data.map((tx) => {
      const incoming = tx.recipient === addr;
      const raw = Math.round(parseFloat(tx.amount ?? '0') * 1e8);
      return {
        txHash: tx.signature,
        totalAmount: incoming ? raw : -raw,
        feeAmount: Math.round(parseFloat(tx.fee ?? '0') * 1e8),
        timestamp: tx.timestamp,
        sender: incoming ? (tx.creatorAddress ?? undefined) : addr,
        recipient: tx.recipient,
      };
    });
  } else {
    const res = await requestWithTimeout(
      { action: 'GET_USER_WALLET_TRANSACTIONS', coin: chain.coinEnum } as any,
      TIME_MINUTES_5
    );
    return Array.isArray(res) ? res : [];
  }
}

export function useUnifiedHistory(chains: ChainConfig[]): UseUnifiedHistoryResult {
  const [rows, setRows] = useState<UnifiedTxRow[]>([]);
  const [loadingChains, setLoadingChains] = useState<string[]>([]);
  const [errorChains, setErrorChains] = useState<string[]>([]);

  const addRows = useCallback((newRows: UnifiedTxRow[]) => {
    setRows((prev) =>
      [...prev, ...newRows].sort((a, b) => {
        const at = a.timestamp ?? Infinity;
        const bt = b.timestamp ?? Infinity;
        return bt - at;
      })
    );
  }, []);

  const chainKeys = chains.map((c) => c.key).join(',');

  useEffect(() => {
    const nonArrR = chains.filter((c) => c.coinEnum !== 'ARRR');
    setLoadingChains(nonArrR.map((c) => c.ticker));
    setRows([]);
    setErrorChains([]);

    let cancelled = false;

    nonArrR.forEach(async (chain) => {
      try {
        const txs = await fetchChainTxs(chain);
        if (!cancelled) addRows(txs.map((row) => ({ ...row, chain })));
      } catch {
        if (!cancelled) setErrorChains((prev) => [...prev, chain.ticker]);
      } finally {
        if (!cancelled) setLoadingChains((prev) => prev.filter((t) => t !== chain.ticker));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chainKeys]);

  return { rows, loadingChains, errorChains };
}
