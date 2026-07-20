import { useState, useEffect } from 'react';

const urlCache = new Map<string, string | null>();
const fetchOnce = new Map<string, Promise<string | null>>();

function getUrl(key: string): Promise<string | null> {
  if (!fetchOnce.has(key)) {
    const p = qdnRequest({
      action: 'GET_QDN_RESOURCE_URL',
      service: 'THUMBNAIL',
      name: 'Wallet',
      identifier: `wallet-coin-${key}`,
    })
      .then((url: unknown) => {
        const resolved = typeof url === 'string' && url ? url : null;
        urlCache.set(key, resolved);
        return resolved;
      })
      .catch((): string | null => {
        urlCache.set(key, null);
        return null;
      });
    fetchOnce.set(key, p);
  }
  return fetchOnce.get(key)!;
}

export function useCoinImageUrl(ticker: string): string | null {
  const key = ticker.toLowerCase();
  const [url, setUrl] = useState<string | null>(() =>
    urlCache.has(key) ? urlCache.get(key)! : null
  );

  useEffect(() => {
    if (urlCache.has(key)) {
      setUrl(urlCache.get(key) ?? null);
      return;
    }
    getUrl(key).then((resolved) => setUrl(resolved));
  }, [key]);

  return url;
}
