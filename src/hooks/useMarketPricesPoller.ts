import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { currencyAtom, marketPricesAtom } from '../state/global/system';
import { useSupportedChains } from './useSupportedChains';

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

// Home's own GET_MARKET_PRICES cache is only 60s, and the wallet is the only
// Q-App calling it — so our interval directly drives outbound CoinGecko hits.
// Fetch once on open, then refresh every 10 minutes; coin prices don't need
// to be fresher than that for a wallet display.
const POLL_INTERVAL_MS = 10 * 60_000;

// Single app-wide price poller — mount once (in AppLayout) so every consumer
// (grid tiles, coin detail, top bar ticker) shares one GET_MARKET_PRICES call
// per interval instead of each opening its own.
export function useMarketPricesPoller() {
  const { chains } = useSupportedChains();
  const currency = useAtomValue(currencyAtom);
  const setPrices = useSetAtom(marketPricesAtom);

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
        const map: Record<string, number | undefined> = {};
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
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coinKey, currency, setPrices]);
}
