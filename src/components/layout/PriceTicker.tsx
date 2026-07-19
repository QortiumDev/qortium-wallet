import { Box } from '@mui/material';
import { useMemo } from 'react';
import type { ChainConfig } from '../../config/chains';
import { formatFiat } from '../../common/functions';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

interface Props {
  chains: ChainConfig[];
  prices: Record<string, number | undefined>;
  currency: string;
}

// Scrolling per-unit price tape for every coin the wallet has a live price for.
// Prices come from the shared poller (useMarketPricesPoller) - this component
// never fetches on its own.
export function PriceTicker({ chains, prices, currency }: Props) {
  const c = useColors();

  const items = useMemo(
    () =>
      chains
        .filter((chain) => !chain.isNative && prices[chain.coinEnum] != null)
        .map((chain) => ({
          key: chain.key,
          ticker: chain.ticker,
          label: formatFiat(prices[chain.coinEnum]!, currency),
        })),
    [chains, prices, currency]
  );

  if (items.length === 0) return null;

  const duration = Math.max(items.length * 4, 20);

  const renderRow = (suffix: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {items.map((item) => (
        <Box
          key={`${item.key}-${suffix}`}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0.5,
            px: 1.5,
            whiteSpace: 'nowrap',
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: c.monoFontFamily,
              fontSize: '0.7rem',
              fontWeight: tokens.typography.weightBold,
              color: c.textSecondary,
              letterSpacing: '0.04em',
            }}
          >
            {item.ticker}
          </Box>
          <Box
            component="span"
            sx={{
              fontFamily: c.monoFontFamily,
              fontSize: '0.7rem',
              color: c.textPrimary,
            }}
          >
            {item.label}
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      sx={{
        overflow: 'hidden',
        minWidth: 0,
        maskImage:
          'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: 'max-content',
          animation: `wallet-price-ticker ${duration}s linear infinite`,
          '@keyframes wallet-price-ticker': {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
          '&:hover': { animationPlayState: 'paused' },
        }}
      >
        {renderRow('a')}
        {renderRow('b')}
      </Box>
    </Box>
  );
}
