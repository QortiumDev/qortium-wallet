import { useState, useEffect } from 'react';
import {
  DEFAULT_CHAINS,
  KNOWN_CHAIN_MAP,
  type ChainConfig,
} from '../config/chains';

const SESSION_KEY = 'qortium_supported_chains';

interface SupportedBlockchainInfo {
  currencyCode: string;
  walletEnabled: boolean;
  decimalPlaces: number;
  activeNetwork: string;
  supportsHtlc: boolean;
  supportsQortTrades: boolean;
}

export function useSupportedChains(): ChainConfig[] {
  const [chains, setChains] = useState<ChainConfig[]>(DEFAULT_CHAINS);

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        setChains(JSON.parse(cached));
        return;
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    async function discover() {
      try {
        // GET /crosschain/blockchains was added to qortium-core.
        // On non-Qortium nodes this will 404 and we fall back to DEFAULT_CHAINS.
        const res = await fetch('/crosschain/blockchains');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SupportedBlockchainInfo[] = await res.json();

        // QORT is the native coin — not in the foreign blockchain registry,
        // but always shown first.
        const qort = DEFAULT_CHAINS[0];

        const foreign: ChainConfig[] = data
          .filter((info) => info.walletEnabled)
          .map((info) => {
            const known = KNOWN_CHAIN_MAP.get(info.currencyCode);
            if (!known) return undefined;
            // Merge live values over static defaults
            return {
              ...known,
              decimalPlaces: info.decimalPlaces,
              activeNetwork: info.activeNetwork as ChainConfig['activeNetwork'],
              supportsHtlc: info.supportsHtlc,
              supportsQortTrades: info.supportsQortTrades,
            };
          })
          .filter((c): c is ChainConfig => c !== undefined);

        const merged = [qort, ...foreign];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
        setChains(merged);
      } catch {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(DEFAULT_CHAINS));
      }
    }

    discover();
  }, []);

  return chains;
}
