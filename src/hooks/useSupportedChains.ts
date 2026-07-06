import { useState, useEffect } from 'react';
import {
  DEFAULT_CHAINS,
  KNOWN_CHAIN_MAP,
  type ChainConfig,
} from '../config/chains';

const SESSION_KEY = 'qortium_supported_chains';
const SESSION_STATUS_KEY = 'qortium_chain_status';

export type ChainDiscoveryStatus = 'pending' | 'live' | 'fallback';

interface SupportedBlockchainInfo {
  currencyCode: string;
  walletEnabled: boolean;
  decimalPlaces: number;
  activeNetwork: string;
  supportsHtlc: boolean;
  supportsLocalChainTrades: boolean;
}

export function useSupportedChains(): {
  chains: ChainConfig[];
  status: ChainDiscoveryStatus;
} {
  const [chains, setChains] = useState<ChainConfig[]>(() => {
    // Seed from session cache so there's no flash on reload; otherwise start
    // empty so we never show unverified chains during the discovery phase.
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ChainConfig[];
        const supported = parsed
          .map((chain) => {
            const known = KNOWN_CHAIN_MAP.get(chain.key);
            if (!known) return undefined;
            return {
              ...known,
              decimalPlaces: chain.decimalPlaces,
              activeNetwork: chain.activeNetwork,
              supportsHtlc: chain.supportsHtlc,
              supportsLocalChainTrades:
                chain.supportsLocalChainTrades ??
                known.supportsLocalChainTrades,
            };
          })
          .filter((chain): chain is ChainConfig => chain !== undefined);
        if (supported.length > 0) return supported;
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_STATUS_KEY);
      }
    }
    return [];
  });
  const [status, setStatus] = useState<ChainDiscoveryStatus>(() => {
    const s = sessionStorage.getItem(SESSION_STATUS_KEY);
    return (s as ChainDiscoveryStatus) ?? 'pending';
  });

  useEffect(() => {
    // If we already seeded from cache, skip the network call for this session.
    if (sessionStorage.getItem(SESSION_KEY)) return;

    async function discover() {
      try {
        const data: SupportedBlockchainInfo[] = await qdnRequest({
          action: 'GET_CROSSCHAIN_BLOCKCHAINS',
        });

        if (!Array.isArray(data)) throw new Error('Unexpected response shape');

        // QORT is the native coin — not in the foreign blockchain registry,
        // but always shown first.
        const qort = DEFAULT_CHAINS[0];

        const foreign: ChainConfig[] = data
          .filter((info) => info.walletEnabled)
          .map((info) => {
            const code = info.currencyCode?.toUpperCase();
            const known = KNOWN_CHAIN_MAP.get(code);
            if (!known) {
              console.warn(
                `[Walletium] Unknown chain from node: "${info.currencyCode}" — add it to KNOWN_CHAINS in chains.ts`
              );
              return undefined;
            }
            return {
              ...known,
              decimalPlaces: info.decimalPlaces,
              activeNetwork: info.activeNetwork as ChainConfig['activeNetwork'],
              supportsHtlc: info.supportsHtlc,
              supportsLocalChainTrades: info.supportsLocalChainTrades,
            };
          })
          .filter((c): c is ChainConfig => c !== undefined);

        const merged = [qort, ...foreign];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
        sessionStorage.setItem(SESSION_STATUS_KEY, 'live');
        setChains(merged);
        setStatus('live');
      } catch (err) {
        // Don't cache failure — allow retry on next load.
        console.warn('[Walletium] GET_CROSSCHAIN_BLOCKCHAINS failed:', err);
        setChains(DEFAULT_CHAINS);
        setStatus('fallback');
      }
    }

    discover();
  }, []);

  return { chains, status };
}
