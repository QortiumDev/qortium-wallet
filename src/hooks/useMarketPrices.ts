import { useAtomValue } from 'jotai';
import { marketPricesAtom } from '../state/global/system';

export type PriceMap = Record<string, number | undefined>;

// Reads the shared price map kept fresh by useMarketPricesPoller (mounted
// once in AppLayout). Does not fetch itself — see useMarketPricesPoller.ts.
export function useMarketPrices(): PriceMap {
  return useAtomValue(marketPricesAtom);
}
