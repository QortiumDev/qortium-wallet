import { useState, useEffect, useMemo } from 'react';
import type { ChainConfig } from '../config/chains';

// Coin tickers supported by GET_MARKET_PRICES / CoinGecko via Home
const PRICE_SUPPORTED = new Set([
  'ARRR',
  'BTC',
  'DASH',
  'DGB',
  'DOGE',
  'FIRO',
  'LTC',
  'NMC',
  'RVN',
]);

export type PriceMap = Record<string, number | undefined>;

export function useMarketPrices(
  chains: ChainConfig[],
  currency: string
): PriceMap {
  const [prices, setPrices] = useState<PriceMap>({});

  const coinKey = useMemo(
    () =>
      chains
        .filter((c) => !c.isNative && PRICE_SUPPORTED.has(c.coinEnum))
        .map((c) => c.coinEnum)
        .sort()
        .join(','),
    [chains]
  );

  useEffect(() => {
    if (!coinKey) return;

    const coins = coinKey.split(',');
    let cancelled = false;

    async function load() {
      try {
        const res = await qdnRequest({
          action: 'GET_MARKET_PRICES',
          coins,
          currencies: [currency],
        });
        if (cancelled) return;
        const map: PriceMap = {};
        for (const coin of coins) {
          const price = res?.prices?.[coin]?.[currency];
          if (typeof price === 'number') map[coin] = price;
        }
        setPrices(map);
      } catch {
        // prices are optional — leave existing data on failure
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coinKey, currency]);

  return prices;
}
